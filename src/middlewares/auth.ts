import type { Request, Response, NextFunction } from "express";
import type { AccessClaims } from "../seguridad/jwt";
import { verifyAccessToken } from "../seguridad/jwt";
import { prisma } from "../db/prisma";

type PublicRoute = {
  method: string;
  path: string;
};

const PUBLIC_ROUTES: PublicRoute[] = [
  { method: "GET", path: "/health" },
  { method: "POST", path: "/auth/login" },
  { method: "POST", path: "/auth/refresh" },
];

function isPublicRoute(req: Request): boolean {
  if (req.method === "OPTIONS") return true;
  const path = req.path;
  return PUBLIC_ROUTES.some(
    (route) =>
      route.method === req.method &&
      (route.path === path || `/v1${route.path}` === path),
  );
}

async function canBootstrapUsuarios(req: Request): Promise<boolean> {
  const path = req.originalUrl.split("?")[0];
  if (req.method !== "POST" || (path !== "/usuarios" && path !== "/v1/usuarios")) return false;
  const count = await prisma.usuario.count();
  return count === 0;
}

export async function authGlobal(req: Request, res: Response, next: NextFunction) {
  if (isPublicRoute(req)) return next();

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    if (await canBootstrapUsuarios(req)) return next();
    return res.status(401).json({ error: "no autorizado" });
  }

  const token = auth.slice(7);
  try {
    const claims = verifyAccessToken(token);
    const userId = Number(claims.sub);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ error: "token inválido" });
    }

    const session = await prisma.sesion.findUnique({
      where: { id: claims.sid },
      include: { usuario: true },
    });

    if (!session || session.usuarioId !== userId) {
      return res.status(401).json({ error: "sesión inválida" });
    }
    if (session.revokedAt) {
      return res.status(401).json({ error: "sesión revocada" });
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      return res.status(401).json({ error: "sesión expirada" });
    }
    if (session.usuario.tokenVersion !== claims.tv) {
      return res.status(401).json({ error: "token revocado" });
    }
    if (!session.usuario.activo) {
      return res.status(403).json({ error: "usuario inactivo" });
    }

    res.locals.user = claims;
    return next();
  } catch {
    if (await canBootstrapUsuarios(req)) return next();
    return res.status(401).json({ error: "token inválido" });
  }
}

export function requireRoles(roles: Array<AccessClaims["rol"]>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user as AccessClaims | undefined;
    if (!user) {
      return res.status(401).json({ error: "no autorizado" });
    }
    if (!roles.includes(user.rol)) {
      return res.status(403).json({ error: "sin permisos" });
    }
    return next();
  };
}

export function requireRolesOrBootstrap(roles: Array<AccessClaims["rol"]>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user as AccessClaims | undefined;
    if (user && roles.includes(user.rol)) return next();

    if (await canBootstrapUsuarios(req)) return next();

    if (!user) {
      return res.status(401).json({ error: "no autorizado" });
    }
    return res.status(403).json({ error: "sin permisos" });
  };
}
