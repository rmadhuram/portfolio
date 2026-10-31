// One-time export of geekraj.com WordPress content via the REST API.
// Usage: node scripts/wp/export.ts  (writes to content/wp-raw/)
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.WP_BASE ?? "http://geekraj.com";
const OUT = path.resolve("content/wp-raw");

async function fetchAll<T>(route: string, extra = ""): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; ; page++) {
    const url = `${BASE}/?rest_route=/wp/v2/${route}&per_page=100&page=${page}${extra}`;
    const res = await fetch(url);
    if (res.status === 400) break; // past last page
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    const items = (await res.json()) as T[];
    all.push(...items);
    const total = Number(res.headers.get("x-wp-totalpages") ?? "1");
    process.stderr.write(`${route}: page ${page}/${total} (${all.length})\n`);
    if (page >= total) break;
  }
  return all;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const posts = await fetchAll<Record<string, unknown>>("posts", "&context=view");
  const pages = await fetchAll<Record<string, unknown>>("pages");
  const comments = await fetchAll<Record<string, unknown>>("comments", "&status=approve");
  const categories = await fetchAll<Record<string, unknown>>("categories");
  const tags = await fetchAll<Record<string, unknown>>("tags");
  const media = await fetchAll<Record<string, unknown>>("media");
  for (const [name, data] of Object.entries({ posts, pages, comments, categories, tags, media })) {
    await writeFile(path.join(OUT, `${name}.json`), JSON.stringify(data, null, 2));
    console.log(`${name}: ${data.length}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
