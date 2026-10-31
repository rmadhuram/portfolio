import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { PostView } from "@/components/post-view";
import { YearView } from "@/components/year-view";
import { getApprovedComments, getPostBySlug, getPostsByYear, getPublishedSlugs, getYears } from "@/lib/data";
import { excerptFrom, excerptText } from "@/lib/render";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

/** /2014 is a year archive; everything else is a post slug. */
const asYear = (slug: string) => (/^(19|20)\d{2}$/.test(slug) ? Number(slug) : null);

export async function generateStaticParams() {
  try {
    const [slugs, years] = await Promise.all([getPublishedSlugs(), getYears()]);
    return [...slugs.map((slug) => ({ slug })), ...years.map((y) => ({ slug: String(y.year) }))];
  } catch { return []; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const year = asYear(slug);
  if (year) return { title: `${year}`, description: `Posts from ${year}`, alternates: { canonical: `${site.url}/${year}` } };
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
  const year = asYear(slug);
  if (year) {
    const [posts, years] = await Promise.all([getPostsByYear(year), getYears()]);
    if (posts.length === 0) notFound();
    return (
      <SiteShell>
        <YearView year={year} posts={posts} years={years} />
      </SiteShell>
    );
  }
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  const comments = await getApprovedComments(post.id);
  return (
    <SiteShell>
      <PostView post={post} comments={comments} />
    </SiteShell>
  );
}
