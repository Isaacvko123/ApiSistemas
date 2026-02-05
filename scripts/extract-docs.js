const fs = require("fs");
const path = require("path");

const siteRoot = path.join(__dirname, "..", "docs", "site");
const contentRoot = path.join(__dirname, "..", "docs", "content");

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(fp));
    else if (fp.endsWith(".html")) out.push(fp);
  }
  return out;
}

function extractBetween(text, startTag, endTag) {
  const start = text.indexOf(startTag);
  const end = text.indexOf(endTag);
  if (start === -1 || end === -1 || end <= start) return "";
  return text.slice(start + startTag.length, end);
}

function matchFirst(text, re) {
  const m = text.match(re);
  return m ? m[1] : "";
}

const files = walk(siteRoot);
const pages = [];

for (const fp of files) {
  const rel = path.relative(siteRoot, fp);
  const html = fs.readFileSync(fp, "utf8");
  const title = matchFirst(html, /<title>([^<]+)<\/title>/i);
  const header = extractBetween(html, "<header>", "</header>");
  const headerTitle = matchFirst(header, /<h1>([\s\S]*?)<\/h1>/i).trim();
  const headerSubtitle = matchFirst(header, /<p>([\s\S]*?)<\/p>/i).trim();
  const navMatches = [...header.matchAll(/<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/g)];
  const nav = navMatches.map((m) => ({ href: m[1], label: m[2] }));
  const main = extractBetween(html, "<main>", "</main>").trim();
  const afterMain = extractBetween(html, "</main>", "</body>").trim();

  const contentPath = path.join(contentRoot, rel);
  fs.mkdirSync(path.dirname(contentPath), { recursive: true });
  fs.writeFileSync(contentPath, main + "\n", "utf8");

  let scriptFile = "";
  if (afterMain) {
    scriptFile = rel + ".scripts.html";
    const scriptPath = path.join(contentRoot, scriptFile);
    fs.writeFileSync(scriptPath, afterMain + "\n", "utf8");
  }

  pages.push({
    file: rel.replace(/\\/g, "/"),
    title,
    headerTitle,
    headerSubtitle,
    nav,
    script: scriptFile
  });
}

fs.writeFileSync(path.join(contentRoot, "pages.json"), JSON.stringify({ pages }, null, 2), "utf8");
console.log(`Extracted ${pages.length} pages to docs/content.`);
