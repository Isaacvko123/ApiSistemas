import type { Request, Response, NextFunction } from "express";
import client from "prom-client";

const registry = new client.Registry();

client.collectDefaultMetrics({ register: registry });

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total de requests HTTP",
  labelNames: ["method", "route", "status"],
});

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duración de requests HTTP",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
});

registry.registerMetric(httpRequestsTotal);
registry.registerMetric(httpRequestDuration);

function normalizeRoute(path: string) {
  return path.replace(/\d+/g, ":id");
}

function resolveRoute(req: Request) {
  const base = req.baseUrl || "";
  const routePath = req.route?.path || req.path || "";
  const full = `${base}${routePath}`;
  return normalizeRoute(full || req.path || req.originalUrl);
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    const route = resolveRoute(req);
    const labels = {
      method: req.method,
      route: route || "unknown",
      status: String(res.statusCode),
    };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  });
  next();
}

export async function metricsHandler(_req: Request, res: Response) {
  res.setHeader("Content-Type", registry.contentType);
  res.status(200).send(await registry.metrics());
}
