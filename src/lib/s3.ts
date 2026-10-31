import "server-only";
import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { assetBaseUrl } from "@/lib/asset-url";

export { assetBaseUrl };

export function s3Configured(): boolean {
  return Boolean(process.env.S3_BUCKET && process.env.S3_REGION && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
}

let client: S3Client | undefined;
function s3(): S3Client {
  client ??= new S3Client({
    region: process.env.S3_REGION,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
  });
  return client;
}
const bucket = () => process.env.S3_BUCKET!;

export function publicUrl(key: string): string {
  return `${assetBaseUrl()}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** Inverse of publicUrl; undefined if the URL is not in our bucket. */
export function keyFromUrl(url: string): string | undefined {
  const base = assetBaseUrl() + "/";
  if (!url.startsWith(base)) return undefined;
  return url.slice(base.length).split("/").map(decodeURIComponent).join("/");
}

async function exists(key: string): Promise<boolean> {
  try {
    await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** Pick a free key under uploads/YYYY/MM/ for a new file. */
export async function reserveKey(filename: string): Promise<string> {
  const safe = filename.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^_+/, "") || "file";
  const d = new Date();
  const dir = `uploads/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  let key = `${dir}/${safe}`;
  if (await exists(key)) {
    const dot = safe.lastIndexOf(".");
    const stem = dot > 0 ? safe.slice(0, dot) : safe;
    const ext = dot > 0 ? safe.slice(dot) : "";
    key = `${dir}/${stem}-${Date.now().toString(36)}${ext}`;
  }
  return key;
}

/** Presigned PUT the browser can upload to directly (bypasses the 4.5 MB function body limit). */
export async function presignUpload(key: string, contentType: string, expiresInSeconds = 600): Promise<string> {
  const cmd = new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" });
  return getSignedUrl(s3(), cmd, { expiresIn: expiresInSeconds });
}

export async function headObject(key: string): Promise<{ size: number; contentType?: string } | undefined> {
  try {
    const r = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return { size: r.ContentLength ?? 0, contentType: r.ContentType };
  } catch {
    return undefined;
  }
}

export async function deleteObject(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
