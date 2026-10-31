import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import { getPage } from "@/lib/data";
import { renderContent } from "@/lib/render";

export const metadata: Metadata = { title: "About" };

export default async function AboutPage() {
  const page = await getPage("about");
  return (
    <SiteShell>
      <h1 className="text-2xl font-bold tracking-tight">{page?.title ?? "About"}</h1>
      {page ? (
        <div className="prose prose-stone mt-6 max-w-none dark:prose-invert prose-a:text-accent" dangerouslySetInnerHTML={{ __html: renderContent(page.content, page.contentFormat) }} />
      ) : (
        <p className="mt-4 text-muted">Coming soon.</p>
      )}
    </SiteShell>
  );
}
