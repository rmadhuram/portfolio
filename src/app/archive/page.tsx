import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { getArchive, getCategoriesWithCounts } from "@/lib/data";
import { formatDate } from "@/lib/site";

export const metadata: Metadata = { title: "Archive" };

export default async function ArchivePage() {
  const [posts, categories] = await Promise.all([getArchive(), getCategoriesWithCounts()]);
  const byYear = new Map<string, typeof posts>();
  for (const p of posts) {
    const y = p.publishedAt ? String(p.publishedAt.getUTCFullYear()) : "Undated";
    byYear.set(y, [...(byYear.get(y) ?? []), p]);
  }
  return (
    <SiteShell>
      <h1 className="text-2xl font-bold tracking-tight">Archive</h1>
      <p className="mt-2 text-sm text-muted">{posts.length} posts since 2004.</p>
      <p className="mt-4 flex flex-wrap gap-2 text-xs">
        {categories.filter((c) => Number(c.count) > 0).map((c) => (
          <Link key={c.id} href={`/category/${c.slug}`} className="rounded border border-border px-2 py-0.5 text-muted hover:text-foreground">{c.name} ({c.count})</Link>
        ))}
      </p>
      {[...byYear.entries()].map(([year, list]) => (
        <section key={year} className="mt-8">
          <h2 className="text-lg font-semibold">{year === "Undated" ? year : <Link href={`/${year}`} className="hover:text-accent">{year}</Link>}</h2>
          <ul className="mt-2 space-y-1">
            {list.map((p) => (
              <li key={p.id} className="flex gap-3 text-sm">
                <span className="w-16 shrink-0 font-mono text-xs text-muted">{formatDate(p.publishedAt, { month: "short", day: "2-digit" })}</span>
                <Link href={`/${p.slug}`} className="hover:text-accent">{p.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </SiteShell>
  );
}
