import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import { PostList } from "@/components/post-list";
import { getPublishedPosts } from "@/lib/data";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "LinkedIn posts" };

export default async function LinkedInPage() {
  const { posts } = await getPublishedPosts({ source: "linkedin", limit: 200 });
  return (
    <SiteShell>
      <h1 className="text-2xl font-bold tracking-tight">Selected LinkedIn posts</h1>
      <p className="mt-2 text-sm text-muted">
        Hand-picked posts republished from{" "}
        <a href={site.linkedin} target="_blank" rel="me noopener noreferrer" className="text-accent hover:underline">my LinkedIn profile</a>, where most of my writing happens these days.
      </p>
      <PostList posts={posts} emptyText="No LinkedIn posts have been added yet." />
    </SiteShell>
  );
}
