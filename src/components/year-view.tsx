import Link from "next/link";
import { PostList } from "@/components/post-list";
import type { PostSummary } from "@/lib/data";

export function YearView({ year, posts, years }: { year: number; posts: PostSummary[]; years: { year: number; count: number }[] }) {
  const i = years.findIndex((y) => y.year === year);
  const newer = i > 0 ? years[i - 1] : undefined; // years are sorted newest first
  const older = i >= 0 && i < years.length - 1 ? years[i + 1] : undefined;
  return (
    <>
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{year}</h1>
        <p className="text-sm text-muted">{posts.length} post{posts.length === 1 ? "" : "s"}</p>
      </div>
      <PostList posts={posts} yearMarkers={false} />
      <nav className="mt-8 flex items-center justify-between text-sm">
        {newer ? <Link href={`/${newer.year}`} className="hover:text-accent">← {newer.year}</Link> : <span />}
        <Link href="/archive" className="text-muted hover:text-foreground">All years</Link>
        {older ? <Link href={`/${older.year}`} className="hover:text-accent">{older.year} →</Link> : <span />}
      </nav>
    </>
  );
}
