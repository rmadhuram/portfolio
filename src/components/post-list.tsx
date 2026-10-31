import Link from "next/link";
import { renderExcerpt } from "@/lib/render";
import type { PostSummary } from "@/lib/data";
import { formatDate } from "@/lib/site";

export function PostList({ posts, emptyText = "Nothing here yet." }: { posts: PostSummary[]; emptyText?: string }) {
  if (posts.length === 0) return <p className="text-muted">{emptyText}</p>;
  return (
    <ul className="divide-y divide-border">
      {posts.map((p) => (
        <li key={p.id} className="py-5">
          <article>
            <div className="flex items-baseline gap-3 text-xs text-muted">
              <time dateTime={p.publishedAt?.toISOString()}>{formatDate(p.publishedAt)}</time>
              {p.source === "linkedin" && <span className="rounded bg-accent/10 px-1.5 py-0.5 text-accent">LinkedIn</span>}
              {p.categories.map((c) => (
                <Link key={c.id} href={`/category/${c.slug}`} className="hover:text-foreground">{c.name}</Link>
              ))}
              {p.commentCount > 0 && <span>{p.commentCount} comment{p.commentCount === 1 ? "" : "s"}</span>}
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              <Link href={`/${p.slug}`} className="hover:text-accent">{p.title}</Link>
            </h2>
            {p.excerpt && <p className="mt-1 text-sm text-muted" dangerouslySetInnerHTML={{ __html: renderExcerpt(p.excerpt) }} />}
          </article>
        </li>
      ))}
    </ul>
  );
}

export function Pagination({ page, pageCount, base }: { page: number; pageCount: number; base: string }) {
  if (pageCount <= 1) return null;
  const href = (n: number) => (n === 1 ? base : `${base}/page/${n}`);
  return (
    <nav className="mt-8 flex items-center justify-between text-sm">
      {page > 1 ? <Link href={href(page - 1)} className="hover:text-accent">← Newer</Link> : <span />}
      <span className="text-muted">Page {page} of {pageCount}</span>
      {page < pageCount ? <Link href={href(page + 1)} className="hover:text-accent">Older →</Link> : <span />}
    </nav>
  );
}
