const fs = require("fs");
const path = require("path");
const { z } = require("zod-3");
const modulesPath = path.join(__dirname, "..", "docs", "content", "modules.json");
const modules = fs.existsSync(modulesPath)
  ? JSON.parse(fs.readFileSync(modulesPath, "utf8")).modules || []
  : [];

function schemaFromExample(example) {
  if (example === null || example === undefined) return z.object({});
  if (Array.isArray(example)) {
    const item = example[0];
    return z.array(schemaFromExample(item));
  }
  if (typeof example !== "object") {
    if (typeof example === "string") return z.string();
    if (typeof example === "number") return z.number();
    if (typeof example === "boolean") return z.boolean();
    return z.any();
  }
  const shape = {};
  for (const key of Object.keys(example)) {
    shape[key] = schemaFromExample(example[key]);
  }
  return z.object(shape);
}

function fieldType(field) {
  const lower = field.toLowerCase();
  if (lower === "id" || lower.endsWith("id")) return z.number();
  if (lower.includes("fecha") || lower.endsWith("at")) return z.string();
  if (lower === "activo" || lower === "vigente") return z.boolean();
  return z.string();
}

function jsonTypeFromValue(value) {
  if (typeof value === "string") return { type: "string" };
  if (typeof value === "number") return { type: "number" };
  if (typeof value === "boolean") return { type: "boolean" };
  if (Array.isArray(value)) return { type: "array", items: jsonSchemaFromExample(value[0] ?? "") };
  if (value && typeof value === "object") return jsonSchemaFromExample(value);
  return { type: "string" };
}

function jsonSchemaFromExample(example) {
  if (example === null || example === undefined) return { type: "object", properties: {} };
  if (Array.isArray(example)) return { type: "array", items: jsonSchemaFromExample(example[0] ?? "") };
  if (typeof example !== "object") return jsonTypeFromValue(example);
  const properties = {};
  const required = [];
  for (const key of Object.keys(example)) {
    properties[key] = jsonTypeFromValue(example[key]);
    required.push(key);
  }
  return { type: "object", properties, required };
}

function jsonSchemaFromFields(fields, optionalAll = false, exclude = []) {
  const properties = {};
  const required = [];
  for (const f of fields || []) {
    if (exclude.includes(f)) continue;
    const lower = f.toLowerCase();
    let schema = { type: "string" };
    if (lower === "id" || lower.endsWith("id")) schema = { type: "number" };
    if (lower.includes("fecha") || lower.endsWith("at")) schema = { type: "string" };
    if (lower === "activo" || lower === "vigente") schema = { type: "boolean" };
    properties[f] = schema;
    if (!optionalAll) required.push(f);
  }
  return { type: "object", properties, required };
}

function schemaFromQueryType(q) {
  const type = q.type || "string";
  if (type === "number") return { type: "number" };
  if (type === "boolean") return { type: "boolean" };
  if (type === "date" || type === "datetime") {
    return { type: "string", format: "date-time" };
  }
  return { type: "string" };
}

const paths = {
  "/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Login",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                email: { type: "string", format: "email" },
                contrasena: { type: "string", minLength: 10 },
              },
              required: ["email", "contrasena"],
            },
          },
        },
      },
      responses: { "200": { description: "OK" } },
    },
  },
  "/auth/refresh": {
    post: {
      tags: ["Auth"],
      summary: "Refresh tokens",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                refreshToken: { type: "string", minLength: 20 },
              },
              required: ["refreshToken"],
            },
          },
        },
      },
      responses: { "200": { description: "OK" } },
    },
  },
};

for (const mod of modules) {
  const modelFields = mod.model || [];
  const reqSchemaPost = jsonSchemaFromExample(mod.examples?.request);
  const reqSchemaPatch = jsonSchemaFromFields(modelFields, true, ["id", "createdAt", "updatedAt"]);
  const resSchema = jsonSchemaFromExample(mod.examples?.response);
  const resFallback = jsonSchemaFromFields(modelFields, false);
  for (const route of mod.routes || []) {
    const method = route.method.toLowerCase();
    if (!paths[route.path]) paths[route.path] = {};
    const params = [];
    if (route.path.includes("{id}")) {
      params.push({
        name: "id",
        in: "path",
        required: true,
        schema: { type: "number" },
      });
    }
    if (Array.isArray(route.query)) {
      for (const q of route.query) {
        params.push({
          name: q.name,
          in: "query",
          required: q.required === true,
          schema: schemaFromQueryType(q),
          description: q.description || undefined,
        });
      }
    }
    paths[route.path][method] = {
      tags: [mod.title || mod.slug],
      summary: route.desc || `${route.method} ${route.path}`,
      parameters: params.length ? params : undefined,
      requestBody: ["post", "put", "patch"].includes(method)
        ? {
            required: true,
            content: {
              "application/json": {
                schema: method === "patch"
                  ? reqSchemaPatch
                  : reqSchemaPost || jsonSchemaFromFields(modelFields, false, ["id", "createdAt", "updatedAt"]),
              },
            },
          }
        : undefined,
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: resSchema || resFallback,
            },
          },
        },
      },
      security: route.auth ? [{ BearerAuth: [] }] : [],
    };
  }
}

const doc = {
  openapi: "3.0.3",
  info: {
    title: "ApiSistemas",
    version: "1.0.0",
    description: "API para gestión de equipos, resguardos, empleados, localidades y credenciales.",
  },
  servers: [{ url: "http://localhost:8080" }],
  paths,
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
};

const outPath = path.join(__dirname, "..", "docs", "openapi.json");
fs.writeFileSync(outPath, JSON.stringify(doc, null, 2), "utf8");
console.log("Generated docs/openapi.json");
