"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { clearSessionCookie, createSessionToken, isAdmin, setSessionCookie, verifyPassword } from "@/lib/auth";
import { TAGS } from "@/lib/data";
import { renderContent } from "@/lib/render";
import { slugify } from "@/lib/site";
import { deleteObject, headObject, keyFromUrl, presignUpload, publicUrl, reserveKey, s3Configured } from "@/lib/s3";

export type ActionState = { ok?: boolean; error?: string; id?: number } | null;

async function guard() {
  if (!(await isAdmin())) throw new Error("Unauthorized");
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");
  const stored = process.env.ADMIN_PASSWORD_HASH;
  if (!stored) return { error: "ADMIN_PASSWORD_HASH is not configured on the server." };
  await new Promise((r) => setTimeout(r, 400)); // blunt brute-force damper
  if (!verifyPassword(password, stored)) return { error: "Wrong password." };
  await setSessionCookie(await createSessionToken());
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  await clearSessionCookie();
  redirect("/admin/login");
}

const postSchema = z.object({
  id: z.coerce.number().int().optional(),
  title: z.string().trim().min(1, "Title is required").max(300),
  slug: z.string().trim().max(200).optional(),
  excerpt: z.string().trim().max(1000).optional(),
  content: z.string(),
  contentFormat: z.enum(["html", "markdown"]),
  status: z.enum(["draft", "published"]),
  source: z.enum(["blog", "linkedin"]),
  sourceUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  featuredImage: z.string().trim().max(500).optional(),
  publishedAt: z.string().optional(),
  categoryIds: z.array(z.coerce.number().int()).default([]),
  newCategory: z.string().trim().max(200).optional(),
  tags: z.string().optional(),
});

export async function savePost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await guard();
  const parsed = postSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    slug: formData.get("slug"),
    excerpt: formData.get("excerpt"),
    content: formData.get("content") ?? "",
    contentFormat: formData.get("contentFormat"),
    status: formData.get("status"),
    source: formData.get("source"),
    sourceUrl: formData.get("sourceUrl") ?? "",
    featuredImage: formData.get("featuredImage"),
    publishedAt: formData.get("publishedAt"),
    categoryIds: formData.getAll("categoryIds"),
    newCategory: formData.get("newCategory"),
    tags: formData.get("tags"),
  });
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  const d = parsed.data;

  let slug = slugify(d.slug || d.title);
  if (!slug) return { error: "Could not derive a slug." };
  const clash = await db.select({ id: schema.posts.id }).from(schema.posts).where(d.id ? and(eq(schema.posts.slug, slug), ne(schema.posts.id, d.id)) : eq(schema.posts.slug, slug));
  if (clash.length) slug = `${slug}-${Date.now().toString(36)}`;

  const existing = d.id ? (await db.select().from(schema.posts).where(eq(schema.posts.id, d.id)))[0] : undefined;
  if (d.id && !existing) return { error: "Post not found." };

  let publishedAt: Date | null = d.publishedAt ? new Date(d.publishedAt) : existing?.publishedAt ?? null;
  if (d.status === "published" && !publishedAt) publishedAt = new Date();

  const values = {
    title: d.title, slug, excerpt: d.excerpt || null, content: d.content, contentFormat: d.contentFormat, status: d.status,
    source: d.source, sourceUrl: d.sourceUrl || null, featuredImage: d.featuredImage || null, publishedAt,
  };
  let id = d.id;
  if (id) await db.update(schema.posts).set(values).where(eq(schema.posts.id, id));
  else id = Number((await db.insert(schema.posts).values(values))[0].insertId);

  // Categories
  const categoryIds = new Set(d.categoryIds);
  if (d.newCategory) {
    const cslug = slugify(d.newCategory);
    await db.insert(schema.categories).values({ slug: cslug, name: d.newCategory }).onDuplicateKeyUpdate({ set: { name: d.newCategory } });
    const [c] = await db.select({ id: schema.categories.id }).from(schema.categories).where(eq(schema.categories.slug, cslug));
    categoryIds.add(c.id);
  }
  await db.delete(schema.postCategories).where(eq(schema.postCategories.postId, id));
  if (categoryIds.size) await db.insert(schema.postCategories).values([...categoryIds].map((categoryId) => ({ postId: id!, categoryId })));

  // Tags (comma separated names; created on demand)
  const tagNames = [...new Set((d.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean))];
  const tagIds: number[] = [];
  for (const name of tagNames) {
    const tslug = slugify(name);
    if (!tslug) continue;
    await db.insert(schema.tags).values({ slug: tslug, name }).onDuplicateKeyUpdate({ set: { slug: tslug } });
    const [t] = await db.select({ id: schema.tags.id }).from(schema.tags).where(eq(schema.tags.slug, tslug));
    tagIds.push(t.id);
  }
  await db.delete(schema.postTags).where(eq(schema.postTags.postId, id));
  if (tagIds.length) await db.insert(schema.postTags).values(tagIds.map((tagId) => ({ postId: id!, tagId })));

  updateTag(TAGS.posts);
  updateTag(TAGS.taxonomy);
  updateTag(TAGS.post(slug));
  if (existing && existing.slug !== slug) updateTag(TAGS.post(existing.slug));
  if (!d.id) redirect(`/admin/posts/${id}?saved=1`);
  return { ok: true, id };
}

export async function deletePost(formData: FormData) {
  await guard();
  const id = Number(formData.get("id"));
  const [post] = await db.select({ slug: schema.posts.slug }).from(schema.posts).where(eq(schema.posts.id, id));
  if (post) {
    await db.delete(schema.posts).where(eq(schema.posts.id, id));
    updateTag(TAGS.posts);
    updateTag(TAGS.post(post.slug));
  }
  redirect("/admin");
}

export async function previewContent(content: string, format: "html" | "markdown"): Promise<string> {
  await guard();
  return renderContent(content, format);
}

export async function setCommentStatus(formData: FormData) {
  await guard();
  const id = Number(formData.get("id"));
  const status = z.enum(["approved", "pending", "spam"]).parse(formData.get("status"));
  const [c] = await db.select({ postId: schema.comments.postId }).from(schema.comments).where(eq(schema.comments.id, id));
  if (!c) return;
  await db.update(schema.comments).set({ status }).where(eq(schema.comments.id, id));
  updateTag(TAGS.comments(c.postId));
  updateTag(TAGS.posts);
}

export async function deleteComment(formData: FormData) {
  await guard();
  const id = Number(formData.get("id"));
  const [c] = await db.select({ postId: schema.comments.postId }).from(schema.comments).where(eq(schema.comments.id, id));
  if (!c) return;
  await db.delete(schema.comments).where(eq(schema.comments.id, id));
  updateTag(TAGS.comments(c.postId));
  updateTag(TAGS.posts);
}

const pageSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(300),
  content: z.string(),
  contentFormat: z.enum(["html", "markdown"]),
});

export async function savePage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await guard();
  const parsed = pageSchema.safeParse({ slug: formData.get("slug"), title: formData.get("title"), content: formData.get("content") ?? "", contentFormat: formData.get("contentFormat") });
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  const d = { ...parsed.data, slug: slugify(parsed.data.slug) };
  await db.insert(schema.pages).values(d).onDuplicateKeyUpdate({ set: { title: d.title, content: d.content, contentFormat: d.contentFormat } });
  updateTag(TAGS.pages);
  return { ok: true };
}


export async function deleteMedia(formData: FormData) {
  await guard();
  const id = Number(formData.get("id"));
  const [m] = await db.select().from(schema.media).where(eq(schema.media.id, id));
  if (!m) return;
  const key = keyFromUrl(m.url);
  if (key && s3Configured()) await deleteObject(key).catch(() => undefined);
  await db.delete(schema.media).where(eq(schema.media.id, id));
}

export async function bulkDeleteTerms(formData: FormData) {
  await guard();
  const kind = formData.get("kind");
  const ids = formData.getAll("ids").map(Number).filter(Number.isInteger);
  if (!ids.length) return;
  if (kind === "tag") await db.delete(schema.tags).where(inArray(schema.tags.id, ids));
  else await db.delete(schema.categories).where(inArray(schema.categories.id, ids));
  updateTag(TAGS.taxonomy);
  updateTag(TAGS.posts);
}

const MAX_UPLOAD = 100 * 1024 * 1024;

/** Step 1 of an admin upload: reserve a key and hand the browser a presigned PUT URL. */
export async function createUpload(input: { filename: string; contentType: string; size: number }): Promise<{ error: string } | { key: string; uploadUrl: string; publicUrl: string }> {
  await guard();
  if (!s3Configured()) return { error: "S3 is not configured (S3_BUCKET / S3_REGION / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY)." };
  if (!input.filename || input.size <= 0) return { error: "Choose a file." };
  if (input.size > MAX_UPLOAD) return { error: "Max 100 MB." };
  if (!/^(image|video)\//.test(input.contentType)) return { error: "Images and videos only." };
  const key = await reserveKey(input.filename);
  return { key, uploadUrl: await presignUpload(key, input.contentType), publicUrl: publicUrl(key) };
}

/** Step 2: after the browser PUT succeeded, verify the object and record it. */
export async function registerMedia(input: { key: string; filename: string; contentType: string }): Promise<ActionState> {
  await guard();
  if (!input.key.startsWith("uploads/")) return { error: "Invalid key." };
  const head = await headObject(input.key);
  if (!head) return { error: "Upload not found in the bucket." };
  await db.insert(schema.media).values({ url: publicUrl(input.key), filename: input.filename, mimeType: head.contentType ?? input.contentType, size: head.size });
  return { ok: true };
}
