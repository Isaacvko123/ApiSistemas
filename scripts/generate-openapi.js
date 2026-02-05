const fs = require("fs");
const path = require("path");
const { z } = require("zod-3");
const { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } = require("@asteasolutions/zod-to-openapi");

const modulesPath = path.join(__dirname, "..", "docs", "content", "modules.json");
const modules = fs.existsSync(modulesPath)
  ? JSON.parse(fs.readFileSync(modulesPath, "utf8")).modules || []
  : [];

extendZodWithOpenApi(z);
const registry = new OpenAPIRegistry();

const loginSchema = z.object({
  email: z.string().email(),
  contrasena: z.string().min(10),
});
const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

registry.register("LoginRequest", loginSchema);
registry.register("RefreshRequest", refreshSchema);

function schemaFromExample(example) {
  if (!example || typeof example !== "object") return z.object({});
  const shape = {};
  for (const key of Object.keys(example)) {
    shape[key] = z.any();
  }
  return z.object(shape);
}

for (const mod of modules) {
  const reqSchema = schemaFromExample(mod.examples?.request);
  registry.register(`${mod.title || mod.slug}Request`, reqSchema);
}

const paths = {
  "/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Login",
      requestBody: {
        required: true,
        content: { "application/json": { schema: loginSchema } },
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
        content: { "application/json": { schema: refreshSchema } },
      },
      responses: { "200": { description: "OK" } },
    },
  },
};

for (const mod of modules) {
  const reqSchema = schemaFromExample(mod.examples?.request);
  const resSchema = schemaFromExample(mod.examples?.response);
  for (const route of mod.routes || []) {
    const method = route.method.toLowerCase();
    if (!paths[route.path]) paths[route.path] = {};
    paths[route.path][method] = {
      tags: [mod.title || mod.slug],
      summary: route.desc || `${route.method} ${route.path}`,
      requestBody: ["post", "put", "patch"].includes(method)
        ? {
            required: true,
            content: { "application/json": { schema: reqSchema } },
          }
        : undefined,
      responses: {
        "200": {
          description: "OK",
          content: { "application/json": { schema: resSchema } },
        },
      },
      security: route.auth ? [{ BearerAuth: [] }] : [],
    };
  }
}

const generator = new OpenApiGeneratorV3(registry.definitions);
const components = generator.generateComponents();
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
    ...components,
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
