"use client";
import { useActionState } from "react";
import type { Page } from "@/db/schema";
import { savePage, type ActionState } from "@/lib/actions";

const inputCls = "mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm";
const labelCls = "block text-xs font-medium text-muted";

export function PageEditor({ page }: { page: Page | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(savePage, null);
  return (
    <form action={action} className="max-w-3xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>Title<input name="title" defaultValue={page?.title ?? ""} required className={inputCls} /></label>
        <label className={labelCls}>Slug<input name="slug" defaultValue={page?.slug ?? ""} required readOnly={!!page} className={inputCls} /></label>
      </div>
      <label className={labelCls}>Format
        <select name="contentFormat" defaultValue={page?.contentFormat ?? "markdown"} className={inputCls}><option value="markdown">Markdown</option><option value="html">HTML</option></select>
      </label>
      <label className={labelCls}>Content<textarea name="content" defaultValue={page?.content ?? ""} rows={20} className={`${inputCls} font-mono text-[13px]`} /></label>
      <button disabled={pending} className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state?.ok && !pending && <p className="text-xs text-accent">Saved.</p>}
    </form>
  );
}
