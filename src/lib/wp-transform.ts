// Import-time transforms applied once to WordPress HTML before storing in the DB.
// Rendering-time concerns (sanitizing, KaTeX) live in src/lib/render.ts.

/** Map a WordPress upload URL to the local /uploads path (resized variants collapse to the original). */
export function rewriteUploadUrl(u: string): string {
  const m = u.match(/^https?:\/\/(?:www\.)?geekraj\.com\/(?:wordpress\/)?wp-content\/uploads\/(.+)$/);
  if (!m) return u;
  const rel = decodeURIComponent(m[1]).replace(/-\d+x\d+(\.[a-zA-Z0-9]+)$/, "$1");
  return `/uploads/${rel}`;
}

/** Rewrite WP internal links (posts, uploads) to local paths. */
export function rewriteInternalLinks(html: string): string {
  return html
    .replace(/https?:\/\/(?:www\.)?geekraj\.com\/(?:wordpress\/)?wp-content\/uploads\/[^"'\s)<>]+/g, (u) => rewriteUploadUrl(u))
    // old ?p=ID permalinks (with or without the /wordpress/ install prefix) -> /p/ID, which redirects to the slug
    .replace(/href=["']https?:\/\/(?:www\.)?geekraj\.com\/(?:wordpress\/)?\?p=(\d+)["']/gi, 'href="/p/$1"')
    // post permalinks: http://geekraj.com/some-slug/ -> /some-slug/
    .replace(/href=["']https?:\/\/(?:www\.)?geekraj\.com\/([a-z0-9-]+)\/?["']/gi, 'href="/$1/"')
    .replace(/href=["']https?:\/\/(?:www\.)?geekraj\.com\/?["']/gi, 'href="/"');
}

/** Drop srcset/sizes (variants were not migrated) and make images lazy. */
export function simplifyImages(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    let t = tag.replace(/\s(srcset|sizes)=["'][^"']*["']/gi, "");
    if (!/\sloading=/.test(t)) t = t.replace(/^<img/i, '<img loading="lazy"');
    return t;
  });
}

/** [katex]..[/katex] and [latex]..[/latex] -> <span class="math-inline">..</span>; decode WP entities inside. */
export function convertMathShortcodes(html: string): string {
  return html.replace(/\[(katex|latex)\]([\s\S]*?)\[\/\1\]/gi, (_m, _k, body: string) => {
    const tex = body
      .replace(/&#8211;|&#8212;|&ndash;|&mdash;/g, "-")
      .replace(/&#8230;|&hellip;/g, "\\ldots")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
      .replace(/<br\s*\/?>/gi, " ")
      .trim();
    return `<span class="math-inline">${escapeHtml(tex)}</span>`;
  });
}

/** Legacy syntax-highlighter shortcodes like [java]...[/java] -> <pre><code class="language-java">. */
export function convertCodeShortcodes(html: string): string {
  const langs = "java|javascript|js|php|python|cpp|c|csharp|sql|xml|html|css|bash|shell|tcl|ruby|perl";
  const re = new RegExp(`\\[(${langs})\\]([\\s\\S]*?)\\[\\/\\1\\]`, "gi");
  return html.replace(re, (_m, lang: string, body: string) => {
    const code = body.replace(/^\s*\n/, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/?p>/gi, "");
    return `<pre><code class="language-${lang.toLowerCase()}">${code}</code></pre>`;
  });
}

/** Gist embed <script> -> plain link (scripts are stripped at render). */
export function convertGistScripts(html: string): string {
  return html.replace(/<script[^>]+src=["'](https:\/\/gist\.github\.com\/[^"']+?)\.js["'][^>]*><\/script>/gi,
    (_m, url: string) => `<p><a href="${url}">View the code on GitHub Gist</a></p>`);
}

/** Flash-era YouTube <object>/<embed> -> modern iframe. */
export function convertFlashYouTube(html: string): string {
  const toIframe = (id: string) =>
    `<iframe src="https://www.youtube.com/embed/${id}?rel=0" width="560" height="315" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  return html
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, (block) => {
      const m = block.match(/youtube\.com\/(?:v\/|embed\/)([A-Za-z0-9_-]{6,})/i);
      return m ? toIframe(m[1]) : block;
    })
    .replace(/<embed\b[^>]*src=["']https?:\/\/(?:www\.)?youtube\.com\/v\/([A-Za-z0-9_-]{6,})[^"']*["'][^>]*\/?>/gi, (_m, id: string) => toIframe(id));
}

/** Hidden inputs / "Session data" comments injected by an old browser extension into 2009-era posts. */
export function stripEditorJunk(html: string): string {
  return html
    .replace(/<p>\s*(?:<input[^>]*(?:gwProxy|jsProxy)[^>]*\/?>\s*)+<\/p>/gi, "")
    .replace(/<input[^>]*(?:gwProxy|jsProxy)[^>]*\/?>/gi, "")
    .replace(/<p>\s*<!--Session data-->\s*<\/p>/gi, "")
    .replace(/<!--Session data-->/gi, "")
    .replace(/<p>\s*<!--more-->\s*<\/p>/gi, "");
}

export type GalleryImage = { file: string; thumb: string | null; alt: string };
export type Galleries = Record<string, { dir: string; images: GalleryImage[] }>;

/** [nggallery id=N] (NextGEN Gallery plugin) -> the same markup Gutenberg uses for galleries. */
export function convertNggGalleries(html: string, galleries: Galleries): string {
  return html.replace(/<p>\s*\[nggallery\s+id=["']?(\d+)["']?\]\s*<\/p>|\[nggallery\s+id=["']?(\d+)["']?\]/gi, (m, a: string, b: string) => {
    const g = galleries[a ?? b];
    if (!g) return m;
    const items = g.images.map((img) => {
      // NextGEN thumbnails are only ~100px wide; the originals look far better in the grid and are lazy-loaded.
      const full = `/uploads/gallery/${g.dir}/${img.file}`;
      return `<li class="blocks-gallery-item"><figure><a href="${full}"><img loading="lazy" src="${full}" alt="${escapeHtml(img.alt)}" /></a></figure></li>`;
    });
    return `<figure class="wp-block-gallery columns-3 is-cropped ngg-gallery"><ul class="blocks-gallery-grid">${items.join("")}</ul></figure>`;
  });
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#8217;|&rsquo;/g, "’").replace(/&#8216;|&lsquo;/g, "‘").replace(/&#8220;|&ldquo;/g, "“").replace(/&#8221;|&rdquo;/g, "”")
    .replace(/&#8211;|&ndash;/g, "–").replace(/&#8212;|&mdash;/g, "—").replace(/&#8230;|&hellip;/g, "…").replace(/&nbsp;/g, " ");
}

export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

export function transformWpHtml(html: string, galleries: Galleries = {}): string {
  let out = html;
  out = convertNggGalleries(out, galleries);
  out = convertMathShortcodes(out);
  out = convertCodeShortcodes(out);
  out = convertGistScripts(out);
  out = convertFlashYouTube(out);
  out = stripEditorJunk(out);
  out = rewriteInternalLinks(out);
  out = simplifyImages(out);
  return out.trim();
}
