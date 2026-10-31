import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { PostList } from "@/components/post-list";
import { getPublishedPosts } from "@/lib/data";
import { site } from "@/lib/site";

export default function Home() {
  return (
    <SiteShell>
      <section className="py-6">
        <h1 className="text-4xl font-bold tracking-tight">Hi, I’m {site.name}.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          I’m passionate about programming, technology, and education. I have been writing here since 2004 about
          code, math puzzles, hardware tinkering, and the occasional recipe. These days most of my writing happens on{" "}
          <a href={site.linkedin} target="_blank" rel="me noopener noreferrer" className="text-accent hover:underline">LinkedIn</a>.
        </p>
        <p className="mt-4 flex gap-4 text-sm">
          <Link href="/about" className="text-accent hover:underline">About me →</Link>
          <a href={site.github} target="_blank" rel="me noopener noreferrer" className="text-accent hover:underline">GitHub →</a>
        </p>
      </section>
      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Recent writing</h2>
          <Link href="/blog" className="text-sm text-muted hover:text-foreground">All posts →</Link>
        </div>
        <RecentPosts />
      </section>
    </SiteShell>
  );
}

async function RecentPosts() {
  const { posts } = await getPublishedPosts({ limit: 8 });
  return <PostList posts={posts} />;
}
