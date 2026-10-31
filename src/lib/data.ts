// Read side. Every exported query is cached with tags; mutations in src/lib/actions.ts invalidate them.
import { cacheLife, cacheTag } from "next/cache";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Category, Comment, Post, Tag } from "@/db/schema";

export const PAGE_SIZE = 10;
export const TAGS = {
  posts: "posts",
  post: (slug: string) => `post:${slug}`,
  comments: (postId: number) => `comments:${postId}`,
  taxonomy: "taxonomy",
  pages: "pages",
};

export type PostSummary = Pick<Post, "id" | "slug" | "title" | "excerpt" | "featuredImage" | "publishedAt" | "source" | "sourceUrl"> & {
  categories: Category[];
  commentCount: number;
};

const summaryCols = {
  id: schema.posts.id, slug: schema.posts.slug, title: schema.posts.title, excerpt: schema.posts.excerpt,
  featuredImage: schema.posts.featuredImage, publishedAt: schema.posts.publishedAt, source: schema.posts.source, sourceUrl: schema.posts.sourceUrl,
};

async function decorate(rows: Omit<PostSummary, "categories" | "commentCount">[]): Promise<PostSummary[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [cats, counts] = await Promise.all([
    db.select({ postId: schema.postCategories.postId, category: schema.categories }).from(schema.postCategories)
      .innerJoin(schema.categories, eq(schema.categories.id, schema.postCategories.categoryId)).where(inArray(schema.postCategories.postId, ids)),
    db.select({ postId: schema.comments.postId, n: sql<number>`count(*)` }).from(schema.comments)
      .where(and(inArray(schema.comments.postId, ids), eq(schema.comments.status, "approved"))).groupBy(schema.comments.postId),
  ]);
  const countBy = new Map(counts.map((c) => [c.postId, Number(c.n)]));
  return rows.map((r) => ({
    ...r,
    categories: cats.filter((c) => c.postId === r.id).map((c) => c.category),
    commentCount: countBy.get(r.id) ?? 0,
  }));
}

const published = and(eq(schema.posts.status, "published"));

export async function getPublishedPosts(opts: { page?: number; source?: "blog" | "linkedin"; limit?: number } = {}) {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.posts);
  const limit = opts.limit ?? PAGE_SIZE;
  const page = Math.max(1, opts.page ?? 1);
  const where = opts.source ? and(published, eq(schema.posts.source, opts.source)) : published;
  const [rows, [{ n }]] = await Promise.all([
    db.select(summaryCols).from(schema.posts).where(where).orderBy(desc(schema.posts.publishedAt)).limit(limit).offset((page - 1) * limit),
    db.select({ n: sql<number>`count(*)` }).from(schema.posts).where(where),
  ]);
  const total = Number(n);
  return { posts: await decorate(rows), total, page, pageCount: Math.max(1, Math.ceil(total / limit)) };
}

export async function getPublishedSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.posts);
  return (await db.select({ slug: schema.posts.slug }).from(schema.posts).where(published)).map((r) => r.slug);
}

export type PostDetail = Post & { categories: Category[]; tags: Tag[] };

export async function getPostBySlug(slug: string, includeDrafts = false): Promise<PostDetail | null> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.post(slug), TAGS.posts);
  const where = includeDrafts ? eq(schema.posts.slug, slug) : and(eq(schema.posts.slug, slug), published);
  const [post] = await db.select().from(schema.posts).where(where).limit(1);
  if (!post) return null;
  return withTerms(post);
}

export async function getPostById(id: number): Promise<PostDetail | null> {
  const [post] = await db.select().from(schema.posts).where(eq(schema.posts.id, id)).limit(1);
  return post ? withTerms(post) : null;
}

async function withTerms(post: Post): Promise<PostDetail> {
  const [cats, tgs] = await Promise.all([
    db.select({ c: schema.categories }).from(schema.postCategories).innerJoin(schema.categories, eq(schema.categories.id, schema.postCategories.categoryId)).where(eq(schema.postCategories.postId, post.id)),
    db.select({ t: schema.tags }).from(schema.postTags).innerJoin(schema.tags, eq(schema.tags.id, schema.postTags.tagId)).where(eq(schema.postTags.postId, post.id)),
  ]);
  return { ...post, categories: cats.map((x) => x.c), tags: tgs.map((x) => x.t) };
}

export async function getPostByWpId(wpId: number): Promise<{ slug: string } | null> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.posts);
  const [row] = await db.select({ slug: schema.posts.slug }).from(schema.posts).where(and(eq(schema.posts.wpId, wpId), published)).limit(1);
  return row ?? null;
}

export async function getApprovedComments(postId: number): Promise<Comment[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.comments(postId));
  return db.select().from(schema.comments).where(and(eq(schema.comments.postId, postId), eq(schema.comments.status, "approved"))).orderBy(schema.comments.createdAt);
}

export async function getPostsByCategory(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.posts, TAGS.taxonomy);
  const [cat] = await db.select().from(schema.categories).where(eq(schema.categories.slug, slug)).limit(1);
  if (!cat) return null;
  const rows = await db.select(summaryCols).from(schema.posts)
    .innerJoin(schema.postCategories, eq(schema.postCategories.postId, schema.posts.id))
    .where(and(published, eq(schema.postCategories.categoryId, cat.id))).orderBy(desc(schema.posts.publishedAt));
  return { category: cat, posts: await decorate(rows) };
}

export async function getPostsByTag(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.posts, TAGS.taxonomy);
  const [tag] = await db.select().from(schema.tags).where(eq(schema.tags.slug, slug)).limit(1);
  if (!tag) return null;
  const rows = await db.select(summaryCols).from(schema.posts)
    .innerJoin(schema.postTags, eq(schema.postTags.postId, schema.posts.id))
    .where(and(published, eq(schema.postTags.tagId, tag.id))).orderBy(desc(schema.posts.publishedAt));
  return { tag, posts: await decorate(rows) };
}

export async function getCategoriesWithCounts() {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.posts, TAGS.taxonomy);
  return db.select({ id: schema.categories.id, slug: schema.categories.slug, name: schema.categories.name, count: sql<number>`count(${schema.posts.id})` })
    .from(schema.categories)
    .leftJoin(schema.postCategories, eq(schema.postCategories.categoryId, schema.categories.id))
    .leftJoin(schema.posts, and(eq(schema.posts.id, schema.postCategories.postId), published))
    .groupBy(schema.categories.id).orderBy(schema.categories.name);
}

export async function getTagsWithCounts() {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.posts, TAGS.taxonomy);
  return db.select({ id: schema.tags.id, slug: schema.tags.slug, name: schema.tags.name, count: sql<number>`count(${schema.posts.id})` })
    .from(schema.tags)
    .leftJoin(schema.postTags, eq(schema.postTags.tagId, schema.tags.id))
    .leftJoin(schema.posts, and(eq(schema.posts.id, schema.postTags.postId), published))
    .groupBy(schema.tags.id).orderBy(schema.tags.name);
}

export async function getPage(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.pages);
  const [page] = await db.select().from(schema.pages).where(eq(schema.pages.slug, slug)).limit(1);
  return page ?? null;
}

export async function getArchive() {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.posts);
  const rows = await db.select(summaryCols).from(schema.posts).where(and(published, eq(schema.posts.source, "blog"))).orderBy(desc(schema.posts.publishedAt));
  return rows;
}

// ---- Admin (uncached) ----
export async function adminListPosts() {
  return db.select({ ...summaryCols, status: schema.posts.status, updatedAt: schema.posts.updatedAt, contentFormat: schema.posts.contentFormat })
    .from(schema.posts).orderBy(desc(sql`coalesce(${schema.posts.publishedAt}, ${schema.posts.createdAt})`));
}
export async function adminListComments() {
  return db.select({ comment: schema.comments, postTitle: schema.posts.title, postSlug: schema.posts.slug })
    .from(schema.comments).innerJoin(schema.posts, eq(schema.posts.id, schema.comments.postId)).orderBy(desc(schema.comments.createdAt)).limit(200);
}
export async function adminAllCategories() { return db.select().from(schema.categories).orderBy(schema.categories.name); }
export async function adminAllTags() { return db.select().from(schema.tags).orderBy(schema.tags.name); }
export async function adminListMedia() { return db.select().from(schema.media).orderBy(desc(schema.media.createdAt)).limit(200); }
export async function adminListPages() { return db.select().from(schema.pages).orderBy(schema.pages.title); }
