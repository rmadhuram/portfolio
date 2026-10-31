// Import content/wp-raw/*.json into MySQL. Idempotent: re-running updates rows by wp_id.
// Usage: node --env-file=.env.local scripts/wp/import.ts
import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "../../src/db";
import { transformWpHtml, stripTags, decodeEntities, rewriteUploadUrl, type Galleries } from "../../src/lib/wp-transform";
import { absolutizeUploads, absolutizeUploadUrl } from "../../src/lib/asset-url";
import { bloggerFullSize, externalToLocal } from "./download-media";
import { existsSync } from "node:fs";

const RAW = path.resolve("content/wp-raw");
const read = async <T>(n: string): Promise<T[]> => JSON.parse(await readFile(path.join(RAW, `${n}.json`), "utf8"));

type Rendered = { rendered: string };
type WpPost = { id: number; date_gmt: string; modified_gmt: string; slug: string; title: Rendered; content: Rendered; excerpt: Rendered; featured_media: number; categories: number[]; tags: number[] };
type WpPage = { id: number; slug: string; title: Rendered; content: Rendered };
type WpTerm = { id: number; slug: string; name: string; count: number };
type WpComment = { id: number; post: number; parent: number; author_name: string; author_url: string; date_gmt: string; content: Rendered; status: string };
type WpMedia = { id: number; source_url: string };

const utc = (s: string) => new Date(s.endsWith("Z") ? s : `${s}Z`);

/** Point hotlinked <img> (and Blogger full-size links) at local copies when download-media.ts saved one. */
function localizeExternalImages(html: string): string {
  const localFor = (url: string): string | null => {
    const local = externalToLocal(url);
    return existsSync(path.join("public", local)) ? local : null;
  };
  return html
    .replace(/(<img\b[^>]*\ssrc=["'])(https?:\/\/[^"']+)(["'])/gi, (m, pre: string, url: string, post: string) => {
      if (/geekraj\.com/.test(url)) return m;
      const full = bloggerFullSize(url);
      const local = (full && localFor(full)) ?? localFor(url);
      return local ? `${pre}${local}${post}` : m;
    })
    .replace(/(<a\b[^>]*\shref=["'])(https?:\/\/[^"']+)(["'])/gi, (m, pre: string, url: string, post: string) => {
      const full = bloggerFullSize(url);
      const local = full && localFor(full);
      return local ? `${pre}${local}${post}` : m;
    });
}

async function main() {
  const [posts, pages, cats, tags, comments, media] = await Promise.all([
    read<WpPost>("posts"), read<WpPage>("pages"), read<WpTerm>("categories"), read<WpTerm>("tags"), read<WpComment>("comments"), read<WpMedia>("media"),
  ]);
  const mediaById = new Map(media.map((m) => [m.id, m]));
  const galleries: Galleries = await readFile(path.join(RAW, "nggalleries.json"), "utf8").then(JSON.parse, () => ({}));
  const usedCatIds = new Set(posts.flatMap((p) => p.categories));
  const usedTagIds = new Set(posts.flatMap((p) => p.tags));

  // Terms (only those actually used; "Uncategorized" is dropped)
  for (const c of cats) {
    if (!usedCatIds.has(c.id) || c.slug === "uncategorized") continue;
    await db.insert(schema.categories).values({ wpId: c.id, slug: c.slug, name: decodeEntities(c.name) })
      .onDuplicateKeyUpdate({ set: { name: decodeEntities(c.name), wpId: c.id } });
  }
  for (const t of tags) {
    if (!usedTagIds.has(t.id)) continue;
    await db.insert(schema.tags).values({ wpId: t.id, slug: t.slug, name: decodeEntities(t.name) })
      .onDuplicateKeyUpdate({ set: { name: decodeEntities(t.name), wpId: t.id } });
  }
  const catIdByWp = new Map((await db.select().from(schema.categories)).map((c) => [c.wpId, c.id]));
  const tagIdByWp = new Map((await db.select().from(schema.tags)).map((t) => [t.wpId, t.id]));

  // Posts
  for (const p of posts) {
    const featured = p.featured_media ? mediaById.get(p.featured_media) : undefined;
    const row = {
      wpId: p.id,
      slug: p.slug,
      title: decodeEntities(p.title.rendered),
      excerpt: wpExcerpt(p.excerpt.rendered, p.content.rendered) || null,
      content: absolutizeUploads(localizeExternalImages(transformWpHtml(p.content.rendered, galleries))),
      contentFormat: "html" as const,
      status: "published" as const,
      source: "blog" as const,
      featuredImage: featured ? absolutizeUploadUrl(rewriteUploadUrl(featured.source_url)) : null,
      publishedAt: utc(p.date_gmt),
      createdAt: utc(p.date_gmt),
      updatedAt: utc(p.modified_gmt),
    };
    await db.insert(schema.posts).values(row).onDuplicateKeyUpdate({ set: { ...row } });
    const [{ id: postId }] = await db.select({ id: schema.posts.id }).from(schema.posts).where(eq(schema.posts.wpId, p.id));
    await db.delete(schema.postCategories).where(eq(schema.postCategories.postId, postId));
    await db.delete(schema.postTags).where(eq(schema.postTags.postId, postId));
    const catRows = p.categories.map((c) => catIdByWp.get(c)).filter((x): x is number => !!x).map((categoryId) => ({ postId, categoryId }));
    const tagRows = p.tags.map((t) => tagIdByWp.get(t)).filter((x): x is number => !!x).map((tagId) => ({ postId, tagId }));
    if (catRows.length) await db.insert(schema.postCategories).values(catRows);
    if (tagRows.length) await db.insert(schema.postTags).values(tagRows);
  }
  const postIdByWp = new Map((await db.select({ id: schema.posts.id, wpId: schema.posts.wpId }).from(schema.posts)).map((p) => [p.wpId, p.id]));

  // Comments (two passes so parent ids resolve)
  const sorted = [...comments].sort((a, b) => a.id - b.id);
  for (const c of sorted) {
    const postId = postIdByWp.get(c.post);
    if (!postId) { console.warn(`comment ${c.id}: unknown post ${c.post}`); continue; }
    const row = {
      wpId: c.id, postId, parentId: null as number | null,
      authorName: decodeEntities(c.author_name) || "Anonymous",
      authorUrl: c.author_url || null,
      content: absolutizeUploads(transformWpHtml(c.content.rendered)),
      status: "approved" as const,
      createdAt: utc(c.date_gmt),
    };
    await db.insert(schema.comments).values(row).onDuplicateKeyUpdate({ set: row });
  }
  const commentIdByWp = new Map((await db.select({ id: schema.comments.id, wpId: schema.comments.wpId }).from(schema.comments)).map((c) => [c.wpId, c.id]));
  for (const c of sorted) {
    if (!c.parent) continue;
    const parentId = commentIdByWp.get(c.parent) ?? null;
    await db.update(schema.comments).set({ parentId }).where(eq(schema.comments.wpId, c.id));
  }

  // Pages
  for (const pg of pages) {
    const row = { slug: pg.slug, title: decodeEntities(pg.title.rendered), content: absolutizeUploads(transformWpHtml(pg.content.rendered)), contentFormat: "html" as const };
    await db.insert(schema.pages).values(row).onDuplicateKeyUpdate({ set: row });
  }

  const counts = await Promise.all(
    [schema.posts, schema.categories, schema.tags, schema.comments, schema.pages, schema.postCategories, schema.postTags].map(
      async (t) => (await db.select({ n: sql<number>`count(*)` }).from(t))[0].n,
    ),
  );
  console.log({ posts: counts[0], categories: counts[1], tags: counts[2], comments: counts[3], pages: counts[4], postCategories: counts[5], postTags: counts[6] });
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });

/** Excerpt HTML/content → plain text with inline math kept as $...$ (see renderExcerpt in src/lib/render.ts). */
function excerptPlain(html: string): string {
  return stripTags(
    html
      .replace(/<pre[\s\S]*?<\/pre>/g, " ")
      .replace(/<(?:h[1-6]|p|li|br|div|tr|td|th)[^>]*>/g, " ")
      .replace(/\$/g, "\\$")
      .replace(/\[(?:katex|latex)[^\]]*\]([\s\S]*?)\[\/(?:katex|latex)\]/g, (_m, tex: string) => `\u0001${tex.trim().replace(/\s+/g, " ")}\u0002`)
      .replace(/\[(?:&hellip;|…|\.\.\.)\]/g, " ")
      .replace(/\[\/?[a-z_]+(?:\s+[a-z_]+=[^\]]*)*\]/g, " "),
  )
    .replace(/\u0002\s*\u0001/g, "$ $")
    .replace(/[\u0001\u0002]/g, "$")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * WordPress auto-excerpts (ending in [&hellip;]) are 55 words cut blindly, often mid-formula. Rebuild those from the
 * content, treating each $...$ block as one word. Hand-written excerpts are kept as-is.
 */
function wpExcerpt(excerptHtml: string, contentHtml: string, words = 55): string {
  const auto = /\[&hellip;\]\s*(<\/p>\s*)?$/.test(excerptHtml.trim()) || /\[…\]/.test(excerptHtml) || !excerptHtml.trim();
  if (!auto) return excerptPlain(excerptHtml).replace(/\s*(Continue reading|Read more).*$/i, "");
  const text = excerptPlain(contentHtml);
  const tokens = text.match(/(?<!\\)\$[^$\n]+?\$|\S+/g) ?? [];
  if (tokens.length <= words) return text;
  return tokens.slice(0, words).join(" ").replace(/[,;:]$/, "") + "…";
}
