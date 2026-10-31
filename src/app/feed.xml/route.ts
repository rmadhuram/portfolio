import { getPublishedPosts } from "@/lib/data";
import { excerptText } from "@/lib/render";
import { site } from "@/lib/site";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const { posts } = await getPublishedPosts({ limit: 30 });
  const items = posts.map((p) => `
    <item>
      <title>${esc(p.title)}</title>
      <link>${site.url}/${p.slug}</link>
      <guid isPermaLink="true">${site.url}/${p.slug}</guid>
      <pubDate>${(p.publishedAt ?? new Date(0)).toUTCString()}</pubDate>
      ${p.excerpt ? `<description>${esc(excerptText(p.excerpt))}</description>` : ""}
      ${p.categories.map((c) => `<category>${esc(c.name)}</category>`).join("")}
    </item>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(site.shortName)}</title>
    <link>${site.url}</link>
    <description>${esc(site.description)}</description>
    <language>en-us</language>
    <atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
