"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createUpload, registerMedia } from "@/lib/actions";

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ pending?: boolean; error?: string; ok?: boolean }>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return setStatus({ error: "Choose a file." });
    setStatus({ pending: true });
    try {
      const contentType = file.type || "application/octet-stream";
      const res = await createUpload({ filename: file.name, contentType, size: file.size });
      if ("error" in res) return setStatus({ error: res.error });
      const put = await fetch(res.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": contentType } });
      if (!put.ok) return setStatus({ error: `Upload failed (${put.status}). Check the bucket CORS rule.` });
      const reg = await registerMedia({ key: res.key, filename: file.name, contentType });
      if (reg?.error) return setStatus({ error: reg.error });
      if (inputRef.current) inputRef.current.value = "";
      setStatus({ ok: true });
      router.refresh();
    } catch (err) {
      setStatus({ error: err instanceof Error ? err.message : "Upload failed." });
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-center gap-3 rounded border border-border bg-card p-3 text-sm">
      <input ref={inputRef} type="file" name="file" accept="image/*,video/*" required className="text-xs" />
      <button disabled={status.pending} className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">{status.pending ? "Uploading…" : "Upload"}</button>
      {status.error && <span className="text-xs text-red-600">{status.error}</span>}
      {status.ok && <span className="text-xs text-accent">Uploaded.</span>}
    </form>
  );
}
