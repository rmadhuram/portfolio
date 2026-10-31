import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { PostList } from "@/components/post-list";
import { getPostsByTag, getTagsWithCounts } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try { return (await getTagsWithCounts()).map((t) => ({ slug: t.slug })); } catch { return []; }
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPostsByTag((await params).slug);
  return { title: data ? `Tag: ${data.tag.name}` : "Not found" };
}
export default async function TagPage({ params }: Props) {
  const data = await getPostsByTag((await params).slug);
  if (!data) notFound();
  return (
    <SiteShell>
      <h1 className="text-2xl font-bold tracking-tight">Tag: {data.tag.name}</h1>
      <PostList posts={data.posts} />
    </SiteShell>
  );
}
