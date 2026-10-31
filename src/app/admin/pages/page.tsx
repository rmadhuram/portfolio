import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { adminListPages } from "@/lib/data";

export default async function PagesAdmin() {
  await requireAdmin();
  const pages = await adminListPages();
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Pages</h1>
        <Link href="/admin/pages/new" className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white">New page</Link>
      </div>
      <ul className="mt-4 divide-y divide-border text-sm">
        {pages.map((p) => (
          <li key={p.id} className="flex items-center justify-between py-2">
            <Link href={`/admin/pages/${p.slug}`} className="font-medium hover:text-accent">{p.title}</Link>
            <span className="text-xs text-muted">/{p.slug}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">Only the <code>about</code> page has a public route today. Add a route under <code>src/app/</code> to expose another slug.</p>
    </>
  );
}
