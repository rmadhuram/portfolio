import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { PostList } from "@/components/post-list";
import { getCategoriesWithCounts, getPostsByCategory } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try { return (await getCategoriesWithCounts()).map((c) => ({ slug: c.slug })); } catch { return []; }
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPostsByCategory((await params).slug);
  return { title: data ? `Category: ${data.category.name}` : "Not found" };
}
export default async function CategoryPage({ params }: Props) {
  const data = await getPostsByCategory((await params).slug);
  if (!data) notFound();
  return (
    <SiteShell>
      <h1 className="text-2xl font-bold tracking-tight">Category: {data.category.name}</h1>
      <PostList posts={data.posts} />
    </SiteShell>
  );
}
