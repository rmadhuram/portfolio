import Image from "next/image";
import Link from "next/link";
import { CategoryIcon } from "@/components/category-icon";
import { placeholderStyle, visualFor } from "@/lib/category-visuals";
import type { PostSummary } from "@/lib/data";
import { renderExcerpt } from "@/lib/render";
import { formatDate } from "@/lib/site";

function Thumb({ post }: { post: PostSummary }) {
  const visual = visualFor(post.categories, post.slug);
  return (
    <Link href={`/${post.slug}`} tabIndex={-1} aria-hidden="true" className="relative block h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-border sm:h-[6.75rem] sm:w-40">
      {post.thumbnail ? (
        <Image src={post.thumbnail} alt="" fill sizes="(min-width: 640px) 160px, 112px" className="object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
      ) : (
        <span className="thumb-placeholder flex h-full w-full items-center justify-center" style={placeholderStyle(visual.hue) as React.CSSProperties}>
          <CategoryIcon name={visual.icon} className="h-8 w-8 sm:h-9 sm:w-9" />
        </span>
      )}
    </Link>
  );
}

export function PostList({ posts, emptyText = "Nothing here yet.", yearMarkers = true }: { posts: PostSummary[]; emptyText?: string; yearMarkers?: boolean }) {
  if (posts.length === 0) return <p className="text-muted">{emptyText}</p>;
  const yearOf = (p: PostSummary) => p.publishedAt?.getUTCFullYear();
  return (
    <ul>
      {posts.map((p, i) => {
        const year = yearOf(p);
        const marker = yearMarkers && year !== undefined && (i === 0 || year !== yearOf(posts[i - 1]));
        return (
          <li key={p.id} className="group">
            {marker && (
              <div className="mt-8 mb-2 flex items-center gap-3 first:mt-4" aria-label={`Posts from ${year}`}>
                <span className="font-mono text-xs tracking-widest text-muted">{year}</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            )}
            <article className="flex gap-4 py-4 sm:gap-5">
              <Thumb post={p} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted">
                  <time dateTime={p.publishedAt?.toISOString()}>{formatDate(p.publishedAt)}</time>
                  {p.source === "linkedin" && <span className="rounded bg-accent/10 px-1.5 py-0.5 text-accent">LinkedIn</span>}
                  {p.categories.map((c) => (
                    <Link key={c.id} href={`/category/${c.slug}`} className="hover:text-foreground">{c.name}</Link>
                  ))}
                  {p.commentCount > 0 && <span>{p.commentCount} comment{p.commentCount === 1 ? "" : "s"}</span>}
                </div>
                <h2 className="mt-1 text-lg font-semibold leading-snug tracking-tight">
                  <Link href={`/${p.slug}`} className="hover:text-accent">{p.title}</Link>
                </h2>
                {p.excerpt && <p className="mt-1 line-clamp-2 text-sm text-muted sm:line-clamp-3" dangerouslySetInnerHTML={{ __html: renderExcerpt(p.excerpt) }} />}
              </div>
            </article>
          </li>
        );
      })}
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
