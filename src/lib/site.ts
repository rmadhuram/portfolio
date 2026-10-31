export const site = {
  name: "Raj Madhuram",
  shortName: "geekraj",
  tagline: "68 65 6C 6C 6F 20 77 6F 72 6C 64 21",
  description: "Raj Madhuram on programming, math, technology, and the occasional recipe.",
  url: (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  linkedin: "https://www.linkedin.com/in/rmadhuram/",
  github: "https://github.com/rmadhuram",
};

export function formatDate(d: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" }) {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(new Date(d));
}

export function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}
