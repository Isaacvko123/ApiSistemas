import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import YAML from "yaml";

export function setupDocs(app: Express) {
  const specPath = path.join(process.cwd(), "docs", "openapi.yaml");
  if (!fs.existsSync(specPath)) {
    console.warn("[DOCS] No se encontró docs/openapi.yaml");
    return;
  }

  const raw = fs.readFileSync(specPath, "utf8");
  const spec = YAML.parse(raw);

  app.get("/docs.json", (_req, res) => {
    res.status(200).json(spec);
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
}
