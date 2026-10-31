# geekraj.com — portfolio + blog

Next.js 16 (App Router, Cache Components) + MySQL (Drizzle ORM), deployed on Vercel.
Replaces the old WordPress blog; all 128 posts, 83 comments, categories, tags, media and the About page were imported.

## Local development

```bash
docker run -d --name portfolio-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=portfolio -p 3307:3306 mysql:8.4
cp .env.example .env.local          # then fill in values (see below)
npm install
npm run db:push                     # create tables
npm run wp:import                   # load content/wp-raw/*.json into MySQL
npm run dev
```

Environment variables (`.env.local` locally, Project Settings on Vercel):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `mysql://user:pass@host:3306/db` |
| `DATABASE_SSL` | `true` for managed MySQL providers that require TLS |
| `SITE_URL` | Canonical origin, e.g. `https://geekraj.com` (feeds, sitemap, OG) |
| `ADMIN_PASSWORD_HASH` | Output of `npm run admin:hash -- "<password>"` |
| `AUTH_SECRET` | `openssl rand -base64 32` — signs the admin session cookie |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Bucket holding all images under `uploads/`; admin uploads go there via presigned PUT |
| `ASSET_BASE_URL` | Optional CDN (e.g. CloudFront) in front of the bucket; defaults to the bucket URL |

## Layout

- `src/app/` public routes: `/`, `/blog`, `/blog/page/[n]`, `/[slug]` (posts keep their WordPress slugs), `/category/[slug]`, `/tag/[slug]`, `/archive`, `/linkedin`, `/about`, `/feed.xml`, `sitemap.xml`, `robots.txt`.
- `src/app/admin/` single-user admin: posts (Markdown or HTML, live preview, KaTeX via `$…$`), comments, pages, media.
- `src/lib/data.ts` cached reads (`use cache` + tags); `src/lib/actions.ts` server actions that write and `updateTag`.
- `src/lib/render.ts` sanitizes stored HTML/Markdown and renders KaTeX. Imported posts are stored as HTML; new posts default to Markdown.
- `src/proxy.ts` guards `/admin/*` with the session cookie.
- `next.config.ts` redirects legacy WordPress URLs (`/?p=ID`, `/feed/`, date archives, `/page/N`, `/wp-content/uploads/*`).
- `scripts/wp/` one-time WordPress export (`export.ts`), media download (`download-media.ts`) and MySQL import (`import.ts`). Raw export lives in `content/wp-raw/`; media was mirrored to S3 with `scripts/s3/upload-assets.ts` (a local copy stays in the gitignored `content/uploads-backup/`).

## Deploy (Vercel)

1. `vercel login && vercel link`, add the env vars above to the project (Production + Preview).
2. Run `npm run db:push` and `npm run wp:import` once against the production `DATABASE_URL` (both scripts read `.env.local`). Done 2026-10-31 against the RDS MariaDB 10.11 instance (database `portfolio`, utf8mb4_unicode_ci).
3. `vercel --prod`, then point `geekraj.com` at Vercel (Domains tab) and switch the old host off.

## Notes

- Images: everything lives in the S3 bucket under `uploads/`. Post content stores absolute asset URLs (the importer rewrites `/uploads/...`), and `next.config.ts` redirects legacy `/uploads/*` and `/wp-content/uploads/*` paths to the bucket. `scripts/s3/configure-bucket.ts` applies the public-read policy and the CORS rule the admin uploader needs.
- The hosted RDS instance allows only 30 connections, so `next.config.ts` pins static generation to one worker (`staticGenerationMinPagesPerWorker`). Without that the build fails with "Too many connections".
- New comments are intentionally not accepted; imported ones are displayed read-only.
- LinkedIn posts are added by hand in the admin with Source = LinkedIn and the original URL.
- Unknown URLs render the 404 page with `noindex`, but the HTTP status is 200 for dynamic post slugs (Cache Components limitation).
