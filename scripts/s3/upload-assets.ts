// One-time: mirror public/uploads/** to s3://$S3_BUCKET/uploads/** (idempotent; skips objects already present with the same size).
import { readdir, stat, readFile } from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const ROOT = path.resolve(process.argv[2] ?? "content/uploads-backup");
const PREFIX = "uploads/";
const s3 = new S3Client({ region: process.env.S3_REGION, credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! } });
const Bucket = process.env.S3_BUCKET!;
const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" };

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.isFile() && !e.name.startsWith(".")) out.push(p);
  }
  return out;
}
async function existing(): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  let ContinuationToken: string | undefined;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: PREFIX, ContinuationToken }));
    for (const o of r.Contents ?? []) m.set(o.Key!, o.Size ?? -1);
    ContinuationToken = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return m;
}

const files = await walk(ROOT);
const have = await existing();
let uploaded = 0, skipped = 0, failed = 0;
const queue = [...files];
async function worker() {
  for (let f = queue.shift(); f; f = queue.shift()) {
    const rel = path.relative(ROOT, f).split(path.sep).join("/");
    const Key = PREFIX + rel;
    const size = (await stat(f)).size;
    if (have.get(Key) === size) { skipped++; continue; }
    const ext = path.extname(f).slice(1).toLowerCase();
    try {
      await s3.send(new PutObjectCommand({ Bucket, Key, Body: await readFile(f), ContentType: TYPES[ext] ?? "application/octet-stream", CacheControl: "public, max-age=31536000, immutable" }));
      uploaded++;
    } catch (e) { failed++; console.error("FAIL", Key, (e as Error).message); }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
const after = await existing();
const missing = files.map((f) => PREFIX + path.relative(ROOT, f).split(path.sep).join("/")).filter((k) => !after.has(k));
console.log({ files: files.length, uploaded, skipped, failed, inBucket: after.size, missing });
