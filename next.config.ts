import type { NextConfig } from "next";

const assetBase = (process.env.ASSET_BASE_URL ?? `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com`).replace(/\/$/, "");
const assetHost = new URL(assetBase).hostname;

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // Hosted MySQL allows few connections; keep static generation on one worker.
    staticGenerationMinPagesPerWorker: 1000,
    staticGenerationMaxConcurrency: 4,
  },
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: assetHost }],
  },
  async redirects() {
    return [
      // Legacy WordPress URLs
      { source: "/feed", destination: "/feed.xml", permanent: true },
      { source: "/feed/:rest*", destination: "/feed.xml", permanent: true },
      { source: "/comments/feed", destination: "/feed.xml", permanent: true },
      { source: "/:year(\\d{4})/:month(\\d{2})", destination: "/:year", permanent: true },
      { source: "/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})", destination: "/:year", permanent: true },
      { source: "/page/:n(\\d+)", destination: "/blog/page/:n", permanent: true },
      { source: "/author/:name*", destination: "/about", permanent: true },
      { source: "/:slug/comment-page-:n(\\d+)", destination: "/:slug", permanent: true },
      { source: "/wp-content/uploads/:path*", destination: `${assetBase}/uploads/:path*`, permanent: true },
      { source: "/wordpress/wp-content/uploads/:path*", destination: `${assetBase}/uploads/:path*`, permanent: true },
      { source: "/uploads/:path*", destination: `${assetBase}/uploads/:path*`, permanent: true },
      { source: "/", has: [{ type: "query", key: "p", value: "(?<id>\\d+)" }], destination: "/p/:id", permanent: true },
      { source: "/", has: [{ type: "query", key: "s" }], destination: "/blog", permanent: false },
    ];
  },
};

export default nextConfig;
