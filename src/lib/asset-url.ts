/** Public base URL for everything under the bucket's `uploads/` prefix (no trailing slash). Safe to import from scripts. */
export function assetBaseUrl(): string {
  const explicit = process.env.ASSET_BASE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (!process.env.S3_BUCKET || !process.env.S3_REGION) throw new Error("S3_BUCKET and S3_REGION (or ASSET_BASE_URL) must be set");
  return `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com`;
}

/** Turn site-relative `/uploads/...` references in HTML or a bare URL into absolute asset URLs. */
export function absolutizeUploads(html: string): string {
  const base = assetBaseUrl();
  return html.replace(/((?:src|href|poster|data-full-url)=["'])\/uploads\//g, `$1${base}/uploads/`);
}
export function absolutizeUploadUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("/uploads/") ? assetBaseUrl() + url : url;
}
