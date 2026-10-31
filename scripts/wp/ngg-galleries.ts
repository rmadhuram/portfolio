// Recover NextGEN Gallery ([nggallery id=N]) image lists. The plugin stores its data outside the
// WordPress REST API, so we read the gallery markup from the Wayback Machine's capture of the
// rendered post, then download the originals (and thumbnails) from the old server (Wayback as fallback).
// Output: content/wp-raw/nggalleries.json  { "<id>": { dir, images: [{ file, full, thumb, alt }] } }
// Files land in public/uploads/gallery/<dir>/ (+ thumbs/).
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";

type Post = { id: number; slug: string; content: { rendered: string } };
type Img = { file: string; full: string; thumb: string | null; alt: string };
const RAW = path.resolve("content/wp-raw");
const PUB = path.resolve("public/uploads/gallery");
const exists = (p: string) => access(p).then(() => true, () => false);

async function fetchBytes(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(60000) });
    if (!r.ok || !/^image\//.test(r.headers.get("content-type") ?? "")) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch { return null; }
}
async function save(url: string, dest: string): Promise<string> {
  if (await exists(dest)) return "cached";
  let buf = await fetchBytes(url);
  let via = "";
  if (!buf) { await new Promise((r) => setTimeout(r, 1500)); buf = await fetchBytes(`https://web.archive.org/web/2012id_/${url}`); via = " (wayback)"; }
  if (!buf) return "FAILED";
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  return `ok ${buf.length}${via}`;
}

async function main() {
  const posts: Post[] = JSON.parse(await readFile(path.join(RAW, "posts.json"), "utf8"));
  const out: Record<string, { dir: string; images: Img[] }> = {};
  for (const p of posts) {
    const ids = [...p.content.rendered.matchAll(/\[nggallery\s+id=["']?(\d+)["']?\]/gi)].map((m) => m[1]);
    if (!ids.length) continue;
    const snap = await fetch(`https://web.archive.org/web/2012id_/http://geekraj.com/?p=${p.id}`, { redirect: "follow", signal: AbortSignal.timeout(90000) });
    const html = snap.ok ? await snap.text() : "";
    console.log(`${p.slug} (wp ${p.id}) gallery ${ids.join(",")}: wayback ${snap.status}, ${html.length} bytes`);
    const images: Img[] = [];
    for (const a of html.matchAll(/<a[^>]+href="https?:\/\/(?:www\.)?geekraj\.com\/wp-content\/gallery\/([^"]+?)\/([^"/]+\.(?:jpe?g|png|gif))"[^>]*>([\s\S]*?)<\/a>/gi)) {
      const [, dir, file, inner] = a;
      if (images.some((i) => i.file === file)) continue;
      const thumb = inner.match(/src="(https?:\/\/[^"]*\/thumbs\/[^"]+)"/i)?.[1] ?? null;
      const alt = inner.match(/alt="([^"]*)"/i)?.[1] ?? "";
      images.push({ file, full: `http://geekraj.com/wp-content/gallery/${dir}/${file}`, thumb, alt: alt.replace(/&quot;/g, '"') });
      out[ids[0]] = { dir, images };
    }
    const g = out[ids[0]];
    if (!g) { console.log("  no gallery markup found"); continue; }
    console.log(`  ${g.images.length} images in ${g.dir}`);
    for (const img of g.images) {
      const r1 = await save(img.full, path.join(PUB, g.dir, img.file));
      const r2 = img.thumb ? await save(img.thumb, path.join(PUB, g.dir, "thumbs", path.basename(img.thumb))) : "n/a";
      console.log(`  ${img.file}: full ${r1}; thumb ${r2}`);
    }
  }
  await writeFile(path.join(RAW, "nggalleries.json"), JSON.stringify(out, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
