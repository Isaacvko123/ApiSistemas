const fs = require("fs");
const path = require("path");

const contentRoot = path.join(__dirname, "..", "docs", "content");
const siteRoot = path.join(__dirname, "..", "docs", "site");

const data = JSON.parse(fs.readFileSync(path.join(contentRoot, "pages.json"), "utf8"));
const modulesPath = path.join(contentRoot, "modules.json");
const modulesData = fs.existsSync(modulesPath)
  ? JSON.parse(fs.readFileSync(modulesPath, "utf8")).modules || []
  : [];

function renderModule(module) {
  const routes = module.routes || [];
  const routeRows = routes.length
    ? routes.map((r) => `<tr><td>${r.method}</td><td>${r.path}</td><td>${r.desc}</td><td>${r.auth ? "Sí" : "No"}</td><td>${(r.roles || []).join(", ") || "-"}</td></tr>`).join("")
    : `<tr><td colspan="5">Sin rutas públicas definidas.</td></tr>`;

  const list = (items) => (items && items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>` : `<p>-</p>`);
  const exampleReq = module.examples?.request ? JSON.stringify(module.examples.request, null, 2) : "{}";
  const exampleRes = module.examples?.response ? JSON.stringify(module.examples.response, null, 2) : "{}";

  return `
      <section class="card">
        <h2>Descripción</h2>
        <p>${module.description || "-"}</p>
      </section>
      <section class="card">
        <h2>Rutas y permisos</h2>
        <table>
          <thead><tr><th>Método</th><th>Ruta</th><th>Descripción</th><th>Auth</th><th>Roles</th></tr></thead>
          <tbody>${routeRows}</tbody>
        </table>
      </section>
      <section class="card">
        <h2>Controller (métodos)</h2>
        ${list(module.controller)}
      </section>
      <section class="card">
        <h2>Modelo (campos clave)</h2>
        ${list(module.model)}
      </section>
      <section class="card">
        <h2>Validaciones</h2>
        ${list(module.validations)}
      </section>
      <section class="card">
        <h2>Ejemplos</h2>
        <div class="grid">
          <div class="box">
            <div class="tag">Request</div>
            <pre>${exampleReq}</pre>
          </div>
          <div class="box">
            <div class="tag">Response</div>
            <pre>${exampleRes}</pre>
          </div>
        </div>
      </section>
      <section class="card">
        <h2>Errores comunes</h2>
        ${list(module.errors)}
      </section>
      <section class="card">
        <h2>Checklist operativo</h2>
        ${list(module.checklist)}
      </section>
  `;
}

function renderNav(nav = []) {
  if (!nav.length) return "";
  const links = nav.map((n) => `<a href=\"${n.href}\">${n.label}</a>`).join("\n        ");
  return `\n      <div class=\"nav\">\n        ${links}\n      </div>`;
}

for (const page of data.pages) {
  const mainPath = path.join(contentRoot, page.file);
  let mainHtml = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, "utf8") : "";
  const isOperacion = page.file.startsWith("operacion/");
  if (page.file === "operacion/index.html" && modulesData.length) {
    const cards = modulesData
      .map((m) => {
        const href = `/docs/operacion/${m.slug}.html`;
        return `<div class=\"box\"><div class=\"tag\">${m.title}</div><p>${m.subtitle || m.description || ""}</p><p><a href=\"${href}\">Ver detalle</a></p></div>`;
      })
      .join("\n");
    mainHtml = `<section class=\"card\"><h2>Operación técnica</h2><p>Consulta por tabla para ver endpoints, validaciones, errores y checklist operativo.</p></section><section class=\"card\"><div class=\"grid\">${cards}</div></section>`;
  } else if (isOperacion && modulesData.length) {
    const slug = path.basename(page.file, ".html");
    const mod = modulesData.find((m) => m.slug === slug);
    if (mod) {
      mainHtml = renderModule(mod);
    }
  }
  let scriptHtml = "";
  if (page.script) {
    const scriptPath = path.join(contentRoot, page.script);
    if (fs.existsSync(scriptPath)) scriptHtml = fs.readFileSync(scriptPath, "utf8");
  }

  let headerTitle = page.headerTitle || page.title || "Documentación";
  let headerSubtitle = page.headerSubtitle || "";
  if (page.file.startsWith("operacion/") && modulesData.length) {
    const slug = path.basename(page.file, ".html");
    const mod = modulesData.find((m) => m.slug === slug);
    if (mod) {
      headerTitle = mod.title || headerTitle;
      headerSubtitle = mod.subtitle || headerSubtitle;
    }
  }
  const navHtml = renderNav(page.nav);

  const html = `<!doctype html>
<html lang=\"es\">
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>${page.title || headerTitle}</title>
    <link rel=\"stylesheet\" href=\"/docs/assets/docs.css\" />
  </head>
  <body>
    <header>
      <h1>${headerTitle}</h1>
      ${headerSubtitle ? `<p>${headerSubtitle}</p>` : ""}
      ${navHtml}
    </header>
    <main>
${mainHtml}
    </main>
${scriptHtml ? `\n${scriptHtml}\n` : ""}
  </body>
</html>
`;

  const outPath = path.join(siteRoot, page.file);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, "utf8");
}

console.log(`Built ${data.pages.length} docs pages.`);
