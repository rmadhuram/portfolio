import Link from "next/link";
import type { Comment } from "@/db/schema";
import type { PostDetail } from "@/lib/data";
import { renderContent } from "@/lib/render";
import { formatDate } from "@/lib/site";

export function PostView({ post, comments }: { post: PostDetail; comments: Comment[] }) {
  const html = renderContent(post.content, post.contentFormat);
  return (
    <article>
      <header className="mb-8">
        <div className="flex flex-wrap items-baseline gap-3 text-xs text-muted">
          <time dateTime={post.publishedAt?.toISOString()}>{formatDate(post.publishedAt, { year: "numeric", month: "long", day: "numeric" })}</time>
          {post.categories.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`} className="hover:text-foreground">{c.name}</Link>
          ))}
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{post.title}</h1>
        {post.source === "linkedin" && post.sourceUrl && (
          <p className="mt-2 text-sm text-muted">
            Originally posted on <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">LinkedIn</a>.
          </p>
        )}
      </header>
      {post.featuredImage && !post.content.includes(post.featuredImage) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.featuredImage} alt="" className="mb-8 w-full rounded-lg" loading="eager" />
      )}
      <div className="prose prose-stone max-w-none dark:prose-invert prose-a:text-accent prose-pre:bg-stone-900" dangerouslySetInnerHTML={{ __html: html }} />
      {post.tags.length > 0 && (
        <p className="mt-8 flex flex-wrap gap-2 text-xs">
          {post.tags.map((t) => (
            <Link key={t.id} href={`/tag/${t.slug}`} className="rounded border border-border px-2 py-0.5 text-muted hover:text-foreground">#{t.name}</Link>
          ))}
        </p>
      )}
      <Comments comments={comments} />
    </article>
  );
}

function Comments({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) return null;
  const byParent = new Map<number | null, Comment[]>();
  for (const c of comments) {
    const key = c.parentId && comments.some((x) => x.id === c.parentId) ? c.parentId : null;
    byParent.set(key, [...(byParent.get(key) ?? []), c]);
  }
  const render = (parent: number | null, depth: number): React.ReactNode =>
    (byParent.get(parent) ?? []).map((c) => (
      <li key={c.id} className={depth ? "ml-6 border-l border-border pl-4" : ""}>
        <div className="py-3">
          <div className="text-sm">
            {c.authorUrl ? <a href={c.authorUrl} rel="nofollow noopener noreferrer" target="_blank" className="font-medium hover:text-accent">{c.authorName}</a> : <span className="font-medium">{c.authorName}</span>}
            <span className="ml-2 text-xs text-muted">{formatDate(c.createdAt)}</span>
          </div>
          <div className="prose prose-sm prose-stone max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: renderContent(c.content, "html") }} />
        </div>
        {byParent.has(c.id) && <ul>{render(c.id, depth + 1)}</ul>}
      </li>
    ));
  return (
    <section className="mt-12 border-t border-border pt-6">
      <h2 className="text-lg font-semibold">{comments.length} comment{comments.length === 1 ? "" : "s"}</h2>
      <p className="mt-1 text-xs text-muted">Comments were imported from the original WordPress site and are closed.</p>
      <ul className="mt-2 divide-y divide-border">{render(null, 0)}</ul>
    </section>
  );
}
