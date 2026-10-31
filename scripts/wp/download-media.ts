// Download media referenced by post content / featured images into public/uploads.
// WP URLs http://geekraj.com/wp-content/uploads/Y/M/file -> /uploads/Y/M/file
// External hotlinked images (blogger, flickr, ...) -> /uploads/external/<hash>-<name>
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const RAW = path.resolve("content/wp-raw");
const PUB = path.resolve("public/uploads");

type Media = { id: number; source_url: string; mime_type: string };
type Post = { id: number; slug: string; featured_media: number; content: { rendered: string } };

export function wpUrlToLocal(u: string): string | null {
  const m = u.match(/^https?:\/\/(?:www\.)?geekraj\.com\/(?:wordpress\/)?wp-content\/uploads\/(.+)$/);
  return m ? `/uploads/${decodeURIComponent(m[1])}` : null;
}
export function externalToLocal(u: string): string {
  const h = createHash("sha1").update(u).digest("hex").slice(0, 8);
  const name = path.basename(new URL(u).pathname).replace(/[^A-Za-z0-9._-]/g, "_") || "img";
  return `/uploads/external/${h}-${name}`;
}

const BLOGGER_HOST = /(^|\.)(blogger\.com|blogspot\.com|googleusercontent\.com)$/;
/** For a Blogger image or "-h" page URL, the URL of the full-size original; null if not a Blogger sized URL. */
export function bloggerFullSize(u: string): string | null {
  try {
    if (!BLOGGER_HOST.test(new URL(u).hostname)) return null;
  } catch { return null; }
  const m = u.match(/^(.*)\/s\d+(?:-[a-z])?(?:-h)?\/([^/?#]+)$/);
  return m ? `${m[1]}/s1600/${m[2]}` : null;
}

async function exists(p: string) { try { await access(p); return true; } catch { return false; } }

async function fetchMedia(url: string): Promise<{ buf: Buffer } | { fail: string }> {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(30000) });
    if (!res.ok) return { fail: `HTTP ${res.status}` };
    const ct = res.headers.get("content-type") ?? "";
    if (!/^(image|video)\//.test(ct)) return { fail: `skip content-type ${ct}` };
    return { buf: Buffer.from(await res.arrayBuffer()) };
  } catch (e) { return { fail: `error ${(e as Error).message}` }; }
}

/** Dead hotlinked images: ask the Wayback Machine for the snapshot closest to 2010 (when most of these posts were written).
 *  The /web/<ts>id_/<url> form redirects to the nearest capture and returns the original bytes; no JSON API needed. */
let waybackChain: Promise<unknown> = Promise.resolve();
async function fetchFromWayback(url: string): Promise<{ buf: Buffer } | { fail: string }> {
  // Serialize + pace Wayback requests; it rate-limits bursts with HTTP 429.
  const run = async () => {
    await new Promise((r) => setTimeout(r, 1500));
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await fetchMedia(`https://web.archive.org/web/20100101id_/${url}`);
      if (!("fail" in r) || !/429/.test(r.fail)) return "fail" in r ? { fail: `wayback ${r.fail}` } : r;
      await new Promise((res) => setTimeout(res, 10000 * (attempt + 1)));
    }
    return { fail: "wayback 429" };
  };
  const p = waybackChain.then(run, run);
  waybackChain = p.catch(() => undefined);
  return p;
}

async function download(url: string, local: string, report: Record<string, string>) {
  const dest = path.join(PUB, local.replace(/^\/uploads\//, ""));
  if (await exists(dest)) { report[url] = "cached"; return; }
  let r = await fetchMedia(url);
  if ("fail" in r && url.includes("/wordpress/wp-content/")) {
    // Old install prefix; the files now live at /wp-content/uploads/
    r = await fetchMedia(url.replace("/wordpress/wp-content/", "/wp-content/"));
  }
  let via = "";
  if ("fail" in r && !/geekraj\.com/.test(url)) {
    const w = await fetchFromWayback(url);
    if (!("fail" in w)) { r = w; via = " (wayback)"; } else { report[url] = `${r.fail}; ${w.fail}`; return; }
  }
  if ("fail" in r) { report[url] = r.fail; return; }
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, r.buf);
  report[url] = `ok ${r.buf.length}${via}`;
}

async function main() {
  const posts: Post[] = JSON.parse(await readFile(path.join(RAW, "posts.json"), "utf8"));
  const media: Media[] = JSON.parse(await readFile(path.join(RAW, "media.json"), "utf8"));
  const mediaById = new Map(media.map((m) => [m.id, m]));
  const html = posts.map((p) => p.content.rendered).join("\n");

  const wpUrls = new Set<string>();
  for (const m of html.matchAll(/https?:\/\/(?:www\.)?geekraj\.com\/(?:wordpress\/)?wp-content\/uploads\/[^"'\s)<>]+/g)) {
    wpUrls.add(m[0]);
    // Content often references only resized variants (-1024x718); the site serves the original, so fetch that too.
    const original = m[0].replace(/-\d+x\d+(\.[a-zA-Z0-9]+)$/, "$1");
    if (original !== m[0]) wpUrls.add(original);
  }
  for (const p of posts) { const f = p.featured_media && mediaById.get(p.featured_media); if (f) wpUrls.add(f.source_url); }

  const extUrls = new Set<string>();
  for (const m of html.matchAll(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi)) {
    const host = new URL(m[1]).hostname;
    if (/geekraj\.com$/.test(host)) continue;
    extUrls.add(m[1]);
    // Blogger serves a sized thumbnail inline (/s320/); the full-size original is at /s1600/.
    const full = bloggerFullSize(m[1]);
    if (full) extUrls.add(full);
  }
  // Links to Blogger's full-size pages (/s1600-h/) point at the same originals.
  for (const m of html.matchAll(/<a[^>]+href=["'](https?:\/\/[^"']+)["']/gi)) {
    const full = bloggerFullSize(m[1]);
    if (full) extUrls.add(full);
  }
  console.log(`wp uploads: ${wpUrls.size}, external images: ${extUrls.size}`);

  const report: Record<string, string> = {};
  const jobs: Array<() => Promise<void>> = [];
  for (const u of wpUrls) jobs.push(() => download(u, wpUrlToLocal(u)!, report));
  for (const u of extUrls) jobs.push(() => download(u, externalToLocal(u), report));
  // 6 at a time
  let i = 0;
  await Promise.all(Array.from({ length: 6 }, async () => { while (i < jobs.length) await jobs[i++](); }));

  await writeFile(path.join(RAW, "media-download-report.json"), JSON.stringify(report, null, 2));
  const summary: Record<string, number> = {};
  for (const v of Object.values(report)) { const k = v.split(" ")[0]; summary[k] = (summary[k] ?? 0) + 1; }
  console.log(summary);
  for (const [u, v] of Object.entries(report)) if (!v.startsWith("ok") && v !== "cached") console.log("FAIL", v, u);
}
if (process.argv[1]?.endsWith("download-media.ts")) main().catch((e) => { console.error(e); process.exit(1); });
