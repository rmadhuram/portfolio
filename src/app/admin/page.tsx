import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { adminListPosts } from "@/lib/data";
import { formatDate } from "@/lib/site";

export default async function AdminHome() {
  await requireAdmin();
  const posts = await adminListPosts();
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Posts <span className="text-sm font-normal text-muted">({posts.length})</span></h1>
        <Link href="/admin/posts/new" className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white">New post</Link>
      </div>
      <table className="mt-4 w-full text-sm">
        <thead className="text-left text-xs text-muted">
          <tr><th className="py-2">Title</th><th>Status</th><th>Source</th><th>Date</th><th></th></tr>
        </thead>
        <tbody className="divide-y divide-border">
          {posts.map((p) => (
            <tr key={p.id}>
              <td className="py-2"><Link href={`/admin/posts/${p.id}`} className="font-medium hover:text-accent">{p.title}</Link><div className="text-xs text-muted">/{p.slug} · {p.contentFormat}</div></td>
              <td className={p.status === "published" ? "text-accent" : "text-muted"}>{p.status}</td>
              <td className="text-muted">{p.source}</td>
              <td className="whitespace-nowrap text-muted">{formatDate(p.publishedAt ?? p.updatedAt)}</td>
              <td className="text-right"><Link href={`/${p.slug}`} className="text-xs text-muted hover:text-foreground" target="_blank">view</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
