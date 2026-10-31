import { assetBaseUrl } from "@/lib/asset-url";

/** Only images we host are safe to use as thumbnails; hotlinks from 2006 are mostly dead. */
function isOurs(src: string): boolean {
  if (src.startsWith("/uploads/")) return true;
  try {
    return src.startsWith(assetBaseUrl() + "/");
  } catch {
    return false;
  }
}

/** Featured image, else the first self-hosted image in the body (HTML <img> or markdown ![](...)). */
export function pickThumbnail(featured: string | null | undefined, content: string, format: "html" | "markdown"): string | null {
  if (featured && isOurs(featured)) return featured;
  const re = format === "markdown" ? /!\[[^\]]*\]\(([^)\s]+)/g : /<img[^>]+src=["']([^"']+)["']/g;
  for (let m = re.exec(content); m; m = re.exec(content)) if (isOurs(m[1])) return m[1];
  return featured ?? null;
}
