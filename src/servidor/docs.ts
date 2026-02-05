import type { Express } from "express";
import express from "express";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import YAML from "yaml";

export function setupDocs(app: Express) {
  const specJsonPath = path.join(process.cwd(), "docs", "openapi.json");
  const specYamlPath = path.join(process.cwd(), "docs", "openapi.yaml");
  const portalPath = path.join(process.cwd(), "docs", "site");
  if (!fs.existsSync(specJsonPath) && !fs.existsSync(specYamlPath)) {
    console.warn("[DOCS] No se encontró docs/openapi.json ni docs/openapi.yaml");
    return;
  }

  let spec: unknown;
  if (fs.existsSync(specJsonPath)) {
    spec = JSON.parse(fs.readFileSync(specJsonPath, "utf8"));
  } else {
    const raw = fs.readFileSync(specYamlPath, "utf8");
    spec = YAML.parse(raw);
  }

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
    app.get("/docs/referencia", (_req, res) => {
      res.sendFile(path.join(portalPath, "referencia_api.html"));
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
  if (fs.existsSync(specJsonPath)) {
    app.get("/docs/openapi.json", (_req, res) => {
      res.sendFile(specJsonPath);
    });
  }

  // Swagger UI SOLO en /docs para no interceptar /docs/portal, /docs/diagramas, etc.
  // Usamos swaggerUrl para que siempre lea el JSON más reciente.
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, { swaggerUrl: "/docs/openapi.json" }),
  );
}
