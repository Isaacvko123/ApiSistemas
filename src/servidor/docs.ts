import type { Express } from "express";
import express from "express";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import YAML from "yaml";

export function setupDocs(app: Express) {
  const specPath = path.join(process.cwd(), "docs", "openapi.yaml");
  const portalPath = path.join(process.cwd(), "docs", "site");
  if (!fs.existsSync(specPath)) {
    console.warn("[DOCS] No se encontró docs/openapi.yaml");
    return;
  }

  const raw = fs.readFileSync(specPath, "utf8");
  const spec = YAML.parse(raw);

  if (fs.existsSync(portalPath)) {
    app.get("/docs/portal", (_req, res) => {
      res.sendFile(path.join(portalPath, "index.html"));
    });
    app.get("/docs/diagramas", (_req, res) => {
      res.sendFile(path.join(portalPath, "diagramas.html"));
    });
    app.get("/docs/arquitectura", (_req, res) => {
      res.sendFile(path.join(portalPath, "arquitectura.html"));
    });
    const assetsPath = path.join(portalPath, "assets");
    if (fs.existsSync(assetsPath)) {
      app.use("/docs/assets", express.static(assetsPath));
    }
    const operacionPath = path.join(portalPath, "operacion");
    if (fs.existsSync(operacionPath)) {
      app.use("/docs/operacion", express.static(operacionPath));
    }
  }

  app.get("/docs.json", (_req, res) => {
    res.status(200).json(spec);
  });

  // Swagger UI SOLO en /docs para no interceptar /docs/portal, /docs/diagramas, etc.
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
}
