import {
  mysqlTable, int, varchar, text, mediumtext, datetime, mysqlEnum, primaryKey, index, uniqueIndex, bigint,
} from "drizzle-orm/mysql-core";
import { relations, sql } from "drizzle-orm";

const timestamps = {
  createdAt: datetime("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => new Date()),
};

export const posts = mysqlTable(
  "posts",
  {
    id: int("id").autoincrement().primaryKey(),
    wpId: int("wp_id"),
    slug: varchar("slug", { length: 200 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    excerpt: text("excerpt"),
    content: mediumtext("content").notNull(),
    contentFormat: mysqlEnum("content_format", ["html", "markdown"]).notNull().default("markdown"),
    status: mysqlEnum("status", ["draft", "published"]).notNull().default("draft"),
    source: mysqlEnum("source", ["blog", "linkedin"]).notNull().default("blog"),
    sourceUrl: varchar("source_url", { length: 500 }),
    featuredImage: varchar("featured_image", { length: 500 }),
    publishedAt: datetime("published_at", { mode: "date" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("posts_slug_idx").on(t.slug),
    uniqueIndex("posts_wp_id_idx").on(t.wpId),
    index("posts_status_published_idx").on(t.status, t.publishedAt),
  ],
);

export const pages = mysqlTable(
  "pages",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 200 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    content: mediumtext("content").notNull(),
    contentFormat: mysqlEnum("content_format", ["html", "markdown"]).notNull().default("markdown"),
    ...timestamps,
  },
  (t) => [uniqueIndex("pages_slug_idx").on(t.slug)],
);

export const categories = mysqlTable(
  "categories",
  {
    id: int("id").autoincrement().primaryKey(),
    wpId: int("wp_id"),
    slug: varchar("slug", { length: 200 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
  },
  (t) => [uniqueIndex("categories_slug_idx").on(t.slug)],
);

export const tags = mysqlTable(
  "tags",
  {
    id: int("id").autoincrement().primaryKey(),
    wpId: int("wp_id"),
    slug: varchar("slug", { length: 200 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
  },
  (t) => [uniqueIndex("tags_slug_idx").on(t.slug)],
);

export const postCategories = mysqlTable(
  "post_categories",
  {
    postId: int("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    categoryId: int("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.categoryId] })],
);

export const postTags = mysqlTable(
  "post_tags",
  {
    postId: int("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    tagId: int("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] })],
);

export const comments = mysqlTable(
  "comments",
  {
    id: int("id").autoincrement().primaryKey(),
    wpId: int("wp_id"),
    postId: int("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    parentId: int("parent_id"),
    authorName: varchar("author_name", { length: 200 }).notNull(),
    authorUrl: varchar("author_url", { length: 500 }),
    content: text("content").notNull(),
    status: mysqlEnum("status", ["approved", "pending", "spam"]).notNull().default("approved"),
    createdAt: datetime("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("comments_post_idx").on(t.postId), uniqueIndex("comments_wp_id_idx").on(t.wpId)],
);

export const media = mysqlTable("media", {
  id: int("id").autoincrement().primaryKey(),
  url: varchar("url", { length: 1000 }).notNull(),
  filename: varchar("filename", { length: 300 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: bigint("size", { mode: "number" }).notNull().default(0),
  createdAt: datetime("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const postsRelations = relations(posts, ({ many }) => ({
  postCategories: many(postCategories),
  postTags: many(postTags),
  comments: many(comments),
}));
export const categoriesRelations = relations(categories, ({ many }) => ({ postCategories: many(postCategories) }));
export const tagsRelations = relations(tags, ({ many }) => ({ postTags: many(postTags) }));
export const postCategoriesRelations = relations(postCategories, ({ one }) => ({
  post: one(posts, { fields: [postCategories.postId], references: [posts.id] }),
  category: one(categories, { fields: [postCategories.categoryId], references: [categories.id] }),
}));
export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
  tag: one(tags, { fields: [postTags.tagId], references: [tags.id] }),
}));
export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
}));

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Page = typeof pages.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Media = typeof media.$inferSelect;
