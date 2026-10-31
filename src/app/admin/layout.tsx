import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/lib/actions";
import { isAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const nav = [
  { href: "/admin", label: "Posts" },
  { href: "/admin/comments", label: "Comments" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/media", label: "Media" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await isAdmin();
  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 text-sm">
          <div className="flex items-center gap-5">
            <Link href="/admin" className="font-semibold">Admin</Link>
            {admin && nav.map((n) => <Link key={n.href} href={n.href} className="text-muted hover:text-foreground">{n.label}</Link>)}
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted hover:text-foreground">View site</Link>
            {admin && <form action={logout}><button className="text-muted hover:text-foreground">Log out</button></form>}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
