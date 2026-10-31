// Render stored content (html or markdown) to safe HTML. Server-only.
import sanitizeHtml from "sanitize-html";
import { marked } from "marked";
import katex from "katex";

const ALLOWED_IFRAME_HOSTS = ["www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com", "jsfiddle.net", "codepen.io", "www.desmos.com"];

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    "img", "figure", "figcaption", "iframe", "video", "source", "h1", "h2", "span", "del", "ins", "sup", "sub", "details", "summary", "kbd", "mark",
  ],
  allowedAttributes: {
    a: ["href", "name", "target", "rel", "title"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    iframe: ["src", "width", "height", "allow", "allowfullscreen", "title", "frameborder", "loading"],
    video: ["src", "controls", "width", "height", "poster", "preload", "muted", "loop", "playsinline"],
    source: ["src", "type"],
    code: ["class"],
    pre: ["class"],
    span: ["class"],
    div: ["class"],
    figure: ["class"],
    table: ["class"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan", "scope"],
    ol: ["start"],
    "*": ["id"],
  },
  allowedClasses: {
    span: ["math-inline"],
    ul: ["blocks-gallery-grid"],
    li: ["blocks-gallery-item"],
    img: ["wp-image-*"],
    div: ["math-display", "wp-block-*", "video-container"],
    figure: ["wp-block-*", "aligncenter", "alignleft", "alignright", "size-*", "columns-*", "is-cropped", "has-nested-images", "ngg-gallery"],
    code: ["language-*"],
    pre: ["wp-block-*", "language-*"],
    table: ["wp-block-*"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowProtocolRelative: false,
  allowedIframeHostnames: ALLOWED_IFRAME_HOSTS,
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const external = /^https?:\/\//i.test(href) && !href.startsWith(process.env.SITE_URL ?? "\u0000");
      return { tagName, attribs: external ? { ...attribs, rel: "noopener noreferrer", target: "_blank" } : attribs };
    },
    // Legacy WordPress content embeds http:// players and images; on the HTTPS site browsers block
    // those as mixed content, so upgrade them (every allowed iframe host serves HTTPS).
    iframe: (tagName, attribs) => ({ tagName, attribs: { ...attribs, src: httpsOnly(attribs.src), loading: "lazy" } }),
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, src: httpsOnly(attribs.src) } }),
  },
};

function renderMath(html: string): string {
  return html
    .replace(/<span class="math-inline">([\s\S]*?)<\/span>/g, (_m, tex: string) => renderTex(tex, false))
    .replace(/<div class="math-display">([\s\S]*?)<\/div>/g, (_m, tex: string) => renderTex(tex, true));
}

function renderTex(escaped: string, displayMode: boolean): string {
  const tex = escaped.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  try {
    return katex.renderToString(tex, { displayMode, throwOnError: false, output: "htmlAndMathml" });
  } catch {
    return `<code>${escaped}</code>`;
  }
}

/** Markdown with $...$ / $$...$$ math. Math is lifted out before marked runs so it is not mangled. */
function markdownToHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const withMath = md
    .replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex: string) => `<div class="math-display">${esc(tex.trim())}</div>`)
    .replace(/(^|[^\\$])\$([^\n$]+?)\$/g, (_m, pre: string, tex: string) => `${pre}<span class="math-inline">${esc(tex.trim())}</span>`);
  return marked.parse(withMath, { gfm: true, async: false }) as string;
}

export function renderContent(content: string, format: "html" | "markdown"): string {
  const html = format === "markdown" ? markdownToHtml(content) : content;
  return renderMath(sanitizeHtml(html, sanitizeOptions));
}

/** Plain-text excerpt for listings and meta descriptions. */
export function excerptFrom(content: string, format: "html" | "markdown", max = 180): string {
  const html = format === "markdown" ? markdownToHtml(content) : content;
  const text = sanitizeHtml(html.replace(/<span class="math-inline">[\s\S]*?<\/span>/g, "").replace(/<pre[\s\S]*?<\/pre>/g, ""), { allowedTags: [], allowedAttributes: {} })
    .replace(/&[a-z#0-9]+;/gi, (e) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" })[e] ?? " ")
    .replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 30))}…`;
}

/**
 * Excerpts are stored as plain text where inline math is kept as $...$ (a literal dollar is \$).
 * renderExcerpt() returns safe HTML with KaTeX applied; excerptText() returns the plain-text form for feeds and meta tags.
 */
export function renderExcerpt(text: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  let out = "";
  const re = /(?<!\\)\$([^$\n]+?)\$/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    out += esc(text.slice(last, m.index)) + renderTex(esc(m[1].trim()), false);
    last = m.index + m[0].length;
  }
  out += esc(text.slice(last));
  return out.replace(/\\\$/g, "$");
}
export function excerptText(text: string): string {
  return text.replace(/(?<!\\)\$([^$\n]+?)\$/g, "$1").replace(/\\\$/g, "$");
}

function httpsOnly(url = ""): string {
  return url.replace(/^(\/\/|http:\/\/)/i, "https://");
}
