import { requireAdmin } from "@/lib/auth";
import { adminListMedia } from "@/lib/data";
import { deleteMedia } from "@/lib/actions";
import { UploadForm } from "./upload-form";

export default async function MediaAdmin() {
  await requireAdmin();
  const items = await adminListMedia();
  return (
    <>
      <h1 className="text-xl font-semibold">Media</h1>
      <p className="mt-1 text-xs text-muted">Uploads go straight from your browser to the S3 bucket. Copy a URL and paste it into a post as <code>![alt](url)</code> or as the featured image.</p>
      <UploadForm />
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {items.map((m) => (
          <li key={m.id} className="rounded border border-border bg-card p-2 text-xs">
            {m.mimeType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt={m.filename} className="aspect-square w-full rounded object-cover" loading="lazy" />
            ) : <div className="aspect-square w-full rounded bg-background" />}
            <input readOnly value={m.url} onFocus={undefined} className="mt-2 w-full truncate rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]" />
            <div className="mt-1 flex justify-between text-muted">
              <span className="truncate" title={m.filename}>{m.filename}</span>
              <form action={deleteMedia}><input type="hidden" name="id" value={m.id} /><button className="text-red-600 hover:underline">Delete</button></form>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
