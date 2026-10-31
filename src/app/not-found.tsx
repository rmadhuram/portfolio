import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

export default function NotFound() {
  return (
    <SiteShell>
      <h1 className="text-2xl font-bold tracking-tight">404 · Not found</h1>
      <p className="mt-2 text-muted">That page doesn’t exist here. Try the <Link href="/archive" className="text-accent hover:underline">archive</Link>.</p>
    </SiteShell>
  );
}
