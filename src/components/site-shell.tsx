import Link from "next/link";
import { site } from "@/lib/site";

const nav = [
  { href: "/blog", label: "Blog" },
  { href: "/linkedin", label: "LinkedIn" },
  { href: "/archive", label: "Archive" },
  { href: "/about", label: "About" },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="font-semibold tracking-tight">
            {site.shortName}
            <span className="ml-2 hidden font-mono text-xs text-muted sm:inline">{site.tagline}</span>
          </Link>
          <nav className="flex gap-4 text-sm text-muted">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-foreground">{n.label}</Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted">
          <span>© 2004–present {site.name}</span>
          <span className="flex gap-4">
            <a href={site.linkedin} rel="me noopener" target="_blank" className="hover:text-foreground">LinkedIn</a>
            <a href={site.github} rel="me noopener" target="_blank" className="hover:text-foreground">GitHub</a>
            <Link href="/feed.xml" className="hover:text-foreground">RSS</Link>
          </span>
        </div>
      </footer>
    </>
  );
}
