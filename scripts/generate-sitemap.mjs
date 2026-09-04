import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const BASE_URL = "https://utkrishtiayurveda.in";

const SKIP_DIRS = new Set([
  ".git",
  ".github",
  "node_modules",
  "scripts",
]);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".well-known") continue;

    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full).replaceAll("\\", "/");

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) out.push(...walk(full));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      out.push(rel);
    }
  }
  return out;
}

function hasNoindex(html) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  return metaTags.some(tag => {
    const isRobots =
      /\bname\s*=\s*["']robots["']/i.test(tag) ||
      /\bname\s*=\s*["']googlebot["']/i.test(tag);
    const noindex = /\bcontent\s*=\s*["'][^"']*\bnoindex\b[^"']*["']/i.test(tag);
    return isRobots && noindex;
  });
}

function getCanonical(html) {
  const links = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of links) {
    if (!/\brel\s*=\s*["'][^"']*\bcanonical\b[^"']*["']/i.test(tag)) continue;
    const m = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function fallbackUrl(file) {
  if (file === "index.html") return `${BASE_URL}/`;
  if (file.endsWith("/index.html")) {
    return `${BASE_URL}/${file.slice(0, -"index.html".length)}`;
  }
  return `${BASE_URL}/${file}`;
}

function getLastmod(file) {
  try {
    const result = execFileSync(
      "git",
      ["log", "-1", "--format=%cs", "--", file],
      { encoding: "utf8" }
    ).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(result)) return result;
  } catch {}
  return new Date().toISOString().slice(0, 10);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const urls = [];

for (const file of walk(ROOT)) {
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");

  // Never publish explicitly noindexed pages in the sitemap.
  if (hasNoindex(html)) continue;

  const canonical = getCanonical(html);
  const loc = canonical || fallbackUrl(file);

  // Only emit canonical URLs belonging to this website.
  if (!loc.startsWith(BASE_URL)) continue;

  urls.push({
    loc,
    lastmod: getLastmod(file),
  });
}

// Remove duplicate canonicals and keep stable URL order.
const unique = [...new Map(urls.map(item => [item.loc, item])).values()]
  .sort((a, b) => a.loc.localeCompare(b.loc));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${unique.map(item => `  <url>
    <loc>${escapeXml(item.loc)}</loc>
    <lastmod>${item.lastmod}</lastmod>
  </url>`).join("\n")}
</urlset>
`;

fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml, "utf8");
console.log(`Generated sitemap.xml with ${unique.length} indexable URL(s).`);
