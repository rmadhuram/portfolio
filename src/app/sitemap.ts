import type { MetadataRoute } from "next";
import { getArchive, getCategoriesWithCounts, getPublishedPosts, getYears } from "@/lib/data";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [blog, linkedin, cats, years] = await Promise.all([getArchive(), getPublishedPosts({ source: "linkedin", limit: 500 }), getCategoriesWithCounts(), getYears()]);
  return [
    { url: site.url, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${site.url}/linkedin`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${site.url}/archive`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${site.url}/about`, changeFrequency: "yearly", priority: 0.5 },
    ...[...blog, ...linkedin.posts].map((p) => ({ url: `${site.url}/${p.slug}`, lastModified: p.publishedAt ?? undefined, priority: 0.7 })),
    ...cats.filter((c) => Number(c.count) > 0).map((c) => ({ url: `${site.url}/category/${c.slug}`, priority: 0.3 })),
    ...years.map((y) => ({ url: `${site.url}/${y.year}`, priority: 0.3 })),
  ];
}
