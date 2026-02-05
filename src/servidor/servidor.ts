// src/servidor/servidor.ts
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import http from "http";
import crypto from "crypto";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "../config/env";
import UsuarioRutas from "../routes/Usuario/UsuarioRuta";
import { authGlobal } from "../middlewares/auth";
import AuthRutas from "../routes/Auth/AuthRuta";
import { ensureBootstrapAdmin } from "../seguridad/bootstrap";
import AdminRutas from "../routes/Admin/AdminRuta";
import { startRotateCredentialsCron } from "../seguridad/rotate-credentials-cron";
import CredencialWebRutas from "../routes/Credenciales/CredencialWebRuta";
import AreaRutas from "../routes/Area/AreaRuta";
import PuestoRutas from "../routes/Puesto/PuestoRuta";
import LocalidadRutas from "../routes/Localidad/LocalidadRuta";
import EmpleadoRutas from "../routes/Empleado/EmpleadoRuta";
import ResguardoRutas from "../routes/Resguardo/ResguardoRuta";
import ResguardoEquipoRutas from "../routes/ResguardoEquipo/ResguardoEquipoRuta";
import DocumentoRutas from "../routes/Documento/DocumentoRuta";
import ChecklistRutas from "../routes/Checklist/ChecklistRuta";
import ChecklistItemRutas from "../routes/ChecklistItem/ChecklistItemRuta";
import WifiCredencialRutas from "../routes/WifiCredencial/WifiCredencialRuta";
import AuditLogRutas from "../routes/AuditLog/AuditLogRuta";
import EquipoRutas from "../routes/Equipo/EquipoRuta";
import TipoEquipoRutas from "../routes/TipoEquipo/TipoEquipoRuta";
import { setupDocs } from "./docs";
import { metricsHandler, metricsMiddleware } from "../observability/metrics";
type RateEntry = {
  count: number;
  resetAt: number;
  lastSeen: number;
};

function requestId() {
  return (req: Request, res: Response, next: NextFunction) => {
    const incoming = req.headers["x-request-id"];
    const requestId = typeof incoming === "string" && incoming.length > 0
      ? incoming
      : crypto.randomUUID();
    res.setHeader("X-Request-Id", requestId);
    res.locals.requestId = requestId;
    return next();
  };
}

function accessLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      const entry = {
        level: "info",
        msg: "http_request",
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Number(ms.toFixed(1)),
        requestId: res.locals.requestId,
        userId: res.locals.user?.sub ?? null,
      };
      if (env.nodeEnv === "production") {
        console.log(JSON.stringify(entry));
      }
    });
    return next();
  };
}

function responseTimer() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    const originalEnd = res.end.bind(res);

    res.end = ((...args: unknown[]) => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      if (!res.headersSent) {
        res.setHeader("X-Response-Time", `${ms.toFixed(1)}ms`);
      }
      if (ms >= env.httpSlowMs) {
        console.warn(`[SLOW HTTP] ${req.method} ${req.originalUrl} ${ms.toFixed(1)}ms`);
      }
      return originalEnd(...(args as [any]));
    }) as typeof res.end;

    return next();
  };
}

function userRateLimiter() {
  const store = new Map<string, RateEntry>();
  const windowMs = env.rateLimitUserWindowMs;
  const max = env.rateLimitUserMax;

  return (req: Request, res: Response, next: NextFunction) => {
    const userId = res.locals.user?.sub;
    if (!userId) return next();
    const key = `user:${userId}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs, lastSeen: now };
    }

    entry.count += 1;
    entry.lastSeen = now;
    store.set(key, entry);

    if (entry.count > max) {
      return res.status(429).json({ error: "Too many requests" });
    }

    if (store.size > 10000) {
      for (const [mapKey, value] of store) {
        if (now > value.resetAt + windowMs) {
          store.delete(mapKey);
        }
      }
    }

    return next();
  };
}

function rateLimiter() {
  const store = new Map<string, RateEntry>();
  const windowMs = env.rateLimitWindowMs;
  const max = env.rateLimitMax;

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip = req.ip || "unknown";

    let entry = store.get(ip);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs, lastSeen: now };
    }

    entry.count += 1;
    entry.lastSeen = now;
    store.set(ip, entry);

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      return res.status(429).json({ error: "Too many requests" });
    }

    if (store.size > 10000) {
      for (const [key, value] of store) {
        if (now > value.resetAt + windowMs) {
          store.delete(key);
        }
      }
    }

    return next();
  };
}

function buildCorsOptions() {
  const origins = env.corsOrigins
    ?.split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  if (origins && origins.length > 0) {
    return { origin: origins, credentials: true };
  }

  if (env.nodeEnv !== "production") {
    return { origin: true, credentials: true };
  }

  console.warn("[SECURITY] CORS_ORIGINS no configurado en producción; CORS deshabilitado.");
  return { origin: false };
}

export function createApp(): Express {
  const app: Express = express();

  // Base mínima
  app.disable("x-powered-by");
  app.set("trust proxy", env.trustProxy);

  app.use(
    helmet({
      // En desarrollo permitimos scripts inline/CDN para el portal de docs/diagramas.
      contentSecurityPolicy: env.nodeEnv === "development" ? false : undefined,
    }),
  );
  app.use(cors(buildCorsOptions()));
  app.use(requestId());
  app.use(accessLogger());
  if (env.metricsEnabled) {
    app.use(metricsMiddleware);
  }
  app.use(responseTimer());
  app.use(rateLimiter());
  app.use(express.json({ limit: env.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: env.bodyLimit }));

  if (env.nodeEnv !== "production") {
    app.use(morgan("dev"));
  }

  if (env.nodeEnv === "development") {
    setupDocs(app);
  }

  app.use(authGlobal);
  app.use(userRateLimiter());

  if (env.metricsEnabled) {
    app.get(env.metricsRoute, metricsHandler);
  }

  // Health para probar levantamiento
  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use("/usuarios", UsuarioRutas);
  app.use("/auth", AuthRutas);
  app.use("/admin", AdminRutas);
  app.use("/credenciales", CredencialWebRutas);
  app.use("/areas", AreaRutas);
  app.use("/puestos", PuestoRutas);
  app.use("/localidades", LocalidadRutas);
  app.use("/empleados", EmpleadoRutas);
  app.use("/resguardos", ResguardoRutas);
  app.use("/resguardo-equipos", ResguardoEquipoRutas);
  app.use("/equipos", EquipoRutas);
  app.use("/tipos-equipo", TipoEquipoRutas);
  app.use("/documentos", DocumentoRutas);
  app.use("/checklists", ChecklistRutas);
  app.use("/checklist-items", ChecklistItemRutas);
  app.use("/wifi-credenciales", WifiCredencialRutas);
  app.use("/audit-logs", AuditLogRutas);

  return app;
}

export async function iniciarServidor(): Promise<http.Server> {
  const app = createApp();
  await ensureBootstrapAdmin();
  startRotateCredentialsCron();
  const server = http.createServer(app);

  const port = env.port; // fallback duro para este proyecto
  server.listen(port, () => {
    console.log(`[API] Listening on http://localhost:${port}`);
  });

  return server;
}
