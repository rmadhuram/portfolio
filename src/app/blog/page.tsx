import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import { PostList, Pagination } from "@/components/post-list";
import { getPublishedPosts } from "@/lib/data";

export const metadata: Metadata = { title: "Blog" };

export default async function BlogPage() {
  const { posts, page, pageCount } = await getPublishedPosts({ page: 1, source: "blog" });
  return (
    <SiteShell>
      <h1 className="text-2xl font-bold tracking-tight">Blog</h1>
      <PostList posts={posts} />
      <Pagination page={page} pageCount={pageCount} base="/blog" />
    </SiteShell>
  );
}
