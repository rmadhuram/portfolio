import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { PostList, Pagination } from "@/components/post-list";
import { getPublishedPosts, PAGE_SIZE } from "@/lib/data";

type Props = { params: Promise<{ n: string }> };

export async function generateStaticParams() {
  try {
    const { total } = await getPublishedPosts({ page: 1, source: "blog", limit: 1 });
    const pages = Math.ceil(total / PAGE_SIZE);
    return Array.from({ length: Math.max(0, pages - 1) }, (_, i) => ({ n: String(i + 2) }));
  } catch { return []; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { n } = await params;
  return { title: `Blog · Page ${n}` };
}

export default async function BlogPageN({ params }: Props) {
  const n = Number((await params).n);
  if (!Number.isInteger(n) || n < 2) notFound();
  const { posts, page, pageCount } = await getPublishedPosts({ page: n, source: "blog" });
  if (posts.length === 0) notFound();
  return (
    <SiteShell>
      <h1 className="text-2xl font-bold tracking-tight">Blog</h1>
      <PostList posts={posts} />
      <Pagination page={page} pageCount={pageCount} base="/blog" />
    </SiteShell>
  );
}
