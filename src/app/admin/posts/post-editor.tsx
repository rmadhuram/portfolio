"use client";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import type { Category } from "@/db/schema";
import type { PostDetail } from "@/lib/data";
import { deletePost, previewContent, savePost, type ActionState } from "@/lib/actions";

const inputCls = "mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm";
const labelCls = "block text-xs font-medium text-muted";

function toLocalInput(d: Date | null | undefined) {
  if (!d) return "";
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function PostEditor({ post, categories, saved }: { post: PostDetail | null; categories: Category[]; saved?: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(savePost, saved ? { ok: true } : null);
  const [content, setContent] = useState(post?.content ?? "");
  const [format, setFormat] = useState<"html" | "markdown">(post?.contentFormat ?? "markdown");
  const [preview, setPreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!showPreview) return;
    const t = setTimeout(() => { previewContent(content, format).then(setPreview).catch(() => setPreview("<p>Preview failed.</p>")); }, 400);
    return () => clearTimeout(t);
  }, [content, format, showPreview]);

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_280px]">
      {post && <input type="hidden" name="id" value={post.id} />}
      <div className="space-y-4">
        <label className={labelCls}>Title<input name="title" defaultValue={post?.title ?? ""} required className={`${inputCls} text-lg font-semibold`} /></label>
        <div className="flex items-center justify-between">
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={() => setShowPreview(false)} className={`rounded px-2 py-1 ${!showPreview ? "bg-accent text-white" : "text-muted"}`}>Write</button>
            <button type="button" onClick={() => setShowPreview(true)} className={`rounded px-2 py-1 ${showPreview ? "bg-accent text-white" : "text-muted"}`}>Preview</button>
          </div>
          <label className="text-xs text-muted">Format{" "}
            <select name="contentFormat" value={format} onChange={(e) => setFormat(e.target.value as "html" | "markdown")} className="rounded border border-border bg-background px-2 py-1">
              <option value="markdown">Markdown</option>
              <option value="html">HTML</option>
            </select>
          </label>
        </div>
        <textarea name="content" value={content} onChange={(e) => setContent(e.target.value)} rows={28} spellCheck
          className={`${inputCls} font-mono text-[13px] leading-relaxed ${showPreview ? "hidden" : ""}`} placeholder={format === "markdown" ? "Write in Markdown. Math: $x^2$ inline or $$...$$ on its own line." : "Raw HTML"} />
        {showPreview && (
          <div className="prose prose-stone min-h-[40rem] max-w-none rounded border border-border bg-card p-4 dark:prose-invert" dangerouslySetInnerHTML={{ __html: preview ?? "<p>Rendering…</p>" }} />
        )}
        <label className={labelCls}>Excerpt<textarea name="excerpt" defaultValue={post?.excerpt ?? ""} rows={2} className={inputCls} placeholder="Optional. Shown in lists and used as the meta description." /></label>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div className="rounded border border-border bg-card p-3 space-y-3">
          <label className={labelCls}>Status
            <select name="status" defaultValue={post?.status ?? "draft"} className={inputCls}><option value="draft">Draft</option><option value="published">Published</option></select>
          </label>
          <label className={labelCls}>Publish date
            <input name="publishedAt" type="datetime-local" defaultValue={toLocalInput(post?.publishedAt)} className={inputCls} />
          </label>
          <label className={labelCls}>Slug<input name="slug" defaultValue={post?.slug ?? ""} placeholder="auto from title" className={inputCls} /></label>
          <button disabled={pending} className="w-full rounded bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
          {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
          {state?.ok && !pending && <p className="text-xs text-accent">Saved.</p>}
          {post && (
            <div className="flex justify-between text-xs">
              <Link href={`/admin/posts/${post.id}/preview`} target="_blank" className="text-muted hover:text-foreground">Full preview</Link>
              {post.status === "published" && <Link href={`/${post.slug}`} target="_blank" className="text-muted hover:text-foreground">View live</Link>}
            </div>
          )}
        </div>

        <div className="rounded border border-border bg-card p-3 space-y-3">
          <label className={labelCls}>Source
            <select name="source" defaultValue={post?.source ?? "blog"} className={inputCls}><option value="blog">Blog</option><option value="linkedin">LinkedIn</option></select>
          </label>
          <label className={labelCls}>Original URL (LinkedIn)<input name="sourceUrl" type="url" defaultValue={post?.sourceUrl ?? ""} placeholder="https://www.linkedin.com/posts/…" className={inputCls} /></label>
          <label className={labelCls}>Featured image URL<input name="featuredImage" defaultValue={post?.featuredImage ?? ""} placeholder="/uploads/… or https://…" className={inputCls} /></label>
        </div>

        <div className="rounded border border-border bg-card p-3 space-y-3">
          <p className={labelCls}>Categories</p>
          <div className="max-h-48 space-y-1 overflow-y-auto text-sm">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2">
                <input type="checkbox" name="categoryIds" value={c.id} defaultChecked={post?.categories.some((x) => x.id === c.id)} /> {c.name}
              </label>
            ))}
          </div>
          <input name="newCategory" placeholder="New category…" className={inputCls} />
          <label className={labelCls}>Tags (comma separated)
            <input name="tags" defaultValue={post?.tags.map((t) => t.name).join(", ") ?? ""} className={inputCls} />
          </label>
        </div>

        {post && (
          <button type="submit" formAction={deletePost} formNoValidate className="w-full rounded border border-red-300 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={(e) => { if (!confirm("Delete this post permanently?")) e.preventDefault(); }}>Delete post</button>
        )}
      </aside>
    </form>
  );
}
