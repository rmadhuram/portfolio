import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { PostView } from "@/components/post-view";
import { getApprovedComments, getPostBySlug, getPublishedSlugs } from "@/lib/data";
import { excerptFrom, excerptText } from "@/lib/render";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try { return (await getPublishedSlugs()).map((slug) => ({ slug })); } catch { return []; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Not found" };
  const description = (post.excerpt && excerptText(post.excerpt)) || excerptFrom(post.content, post.contentFormat);
  return {
    title: post.title,
    description,
    alternates: { canonical: `${site.url}/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      publishedTime: post.publishedAt?.toISOString(),
      images: post.featuredImage ? [post.featuredImage] : undefined,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  const comments = await getApprovedComments(post.id);
  return (
    <SiteShell>
      <PostView post={post} comments={comments} />
    </SiteShell>
  );
}
