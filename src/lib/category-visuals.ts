import type { Category } from "@/db/schema";

export type CategoryVisual = { hue: number; icon: IconName };
export type IconName = "coffee" | "eclipse" | "sigma" | "cpu" | "sparkles" | "code" | "cross" | "bot" | "utensils" | "pen";

const VISUALS: Record<string, CategoryVisual> = {
  java: { hue: 24, icon: "coffee" },
  eclipse: { hue: 262, icon: "eclipse" },
  math: { hue: 205, icon: "sigma" },
  technology: { hue: 172, icon: "cpu" },
  ai: { hue: 300, icon: "sparkles" },
  coding: { hue: 150, icon: "code" },
  programming: { hue: 150, icon: "code" },
  php: { hue: 230, icon: "code" },
  christianity: { hue: 350, icon: "cross" },
  mindstorms: { hue: 45, icon: "bot" },
  recipe: { hue: 15, icon: "utensils" },
  general: { hue: 220, icon: "pen" },
};
const FALLBACK: CategoryVisual = { hue: 220, icon: "pen" };

/** Stable hue from a string so uncategorised posts still vary instead of all looking alike. */
function hashHue(seed: string): number {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 360;
}

/** Prefer a specific category over "general" when a post has several; uncategorised posts get a hue derived from `seed`. */
export function visualFor(categories: Pick<Category, "slug">[], seed = ""): CategoryVisual {
  const specific = categories.find((c) => c.slug !== "general" && VISUALS[c.slug]);
  const known = (specific && VISUALS[specific.slug]) ?? (categories[0] && VISUALS[categories[0].slug]);
  if (known) return known;
  return seed ? { ...FALLBACK, hue: hashHue(seed) } : FALLBACK;
}

/** Inline custom properties for a placeholder tile; globals.css maps them to light/dark backgrounds. */
export function placeholderStyle(hue: number): Record<string, string> {
  return {
    "--ph-bg": `linear-gradient(135deg, hsl(${hue} 60% 92%), hsl(${hue} 50% 84%))`,
    "--ph-fg": `hsl(${hue} 45% 36%)`,
    "--ph-bg-dark": `linear-gradient(135deg, hsl(${hue} 32% 18%), hsl(${hue} 32% 12%))`,
    "--ph-fg-dark": `hsl(${hue} 50% 70%)`,
  };
}
