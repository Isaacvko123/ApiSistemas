import crypto from "crypto";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { hashRefreshToken, verifyRefreshTokenHash } from "./hash";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./jwt";

type Rol = "ADMIN" | "SUPERVISOR" | "GERENTE";

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function now() {
  return new Date();
}

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
};

export type RequestMeta = {
  userAgent?: string | null;
  ip?: string | null;
};

export class SesionesService {
  static async crearSesionYEmitirTokens(params: {
    usuarioId: number;
    rol: Rol;
    tokenVersion: number;
    meta?: RequestMeta;
  }): Promise<LoginResult> {
    const sessionId = crypto.randomUUID();

    const refreshToken = signRefreshToken({
      sub: String(params.usuarioId),
      sid: sessionId,
      tv: params.tokenVersion,
    });

    const refreshHash = await hashRefreshToken(refreshToken);
    const expiresAt = addDays(now(), env.jwtRefreshTtlDays);

    await prisma.sesion.create({
      data: {
        id: sessionId,
        usuarioId: params.usuarioId,
        refreshHash,
        userAgent: params.meta?.userAgent ?? null,
        ip: params.meta?.ip ?? null,
        expiresAt,
        lastUsedAt: now(),
      },
    });

    const accessToken = signAccessToken({
      sub: String(params.usuarioId),
      sid: sessionId,
      tv: params.tokenVersion,
      rol: params.rol,
    });

    return { accessToken, refreshToken, sessionId };
  }

  static async refrescarTokens(params: {
    refreshToken: string;
    meta?: RequestMeta;
  }): Promise<LoginResult> {
    const decoded = verifyRefreshToken(params.refreshToken);

    const usuarioId = Number(decoded.sub);
    const sessionId = decoded.sid;

    if (!Number.isFinite(usuarioId) || !sessionId) {
      throw new Error("refresh inválido");
    }

    const sesion = await prisma.sesion.findUnique({
      where: { id: sessionId },
      include: { usuario: true },
    });

    if (!sesion) throw new Error("sesión no encontrada");
    if (sesion.revokedAt) throw new Error("sesión revocada");
    if (sesion.expiresAt.getTime() <= Date.now()) throw new Error("sesión expirada");

    // revocación global
    if (sesion.usuario.tokenVersion !== decoded.tv) {
      throw new Error("token revocado (tv)");
    }

    // reuse detection
    const okHash = await verifyRefreshTokenHash(sesion.refreshHash, params.refreshToken);
    if (!okHash) {
      await this.revocarTodasLasSesionesDeUsuario({
        usuarioId,
        incrementarTokenVersion: true,
      });
      throw new Error("refresh reutilizado (compromiso detectado)");
    }

    // rotación refresh
    const newRefresh = signRefreshToken({
      sub: String(usuarioId),
      sid: sessionId,
      tv: sesion.usuario.tokenVersion,
    });

    const newHash = await hashRefreshToken(newRefresh);

    await prisma.sesion.update({
      where: { id: sessionId },
      data: {
        refreshHash: newHash,
        lastUsedAt: now(),
        userAgent: params.meta?.userAgent ?? sesion.userAgent,
        ip: params.meta?.ip ?? sesion.ip,
      },
    });

    const accessToken = signAccessToken({
      sub: String(usuarioId),
      sid: sessionId,
      tv: sesion.usuario.tokenVersion,
      rol: sesion.usuario.rol as Rol,
    });

    return { accessToken, refreshToken: newRefresh, sessionId };
  }

  /** Logout dispositivo: idempotente (no truena si ya estaba). */
  static async revocarSesion(sessionId: string): Promise<void> {
    await prisma.sesion.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: now() },
    });
  }

  static async revocarTodasLasSesionesDeUsuario(params: {
    usuarioId: number;
    incrementarTokenVersion?: boolean;
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.sesion.updateMany({
        where: { usuarioId: params.usuarioId, revokedAt: null },
        data: { revokedAt: now() },
      });

      if (params.incrementarTokenVersion) {
        await tx.usuario.update({
          where: { id: params.usuarioId },
          data: { tokenVersion: { increment: 1 } },
        });
      }
    });
  }

  static extraerMeta(req: { headers?: any; ip?: any }): RequestMeta {
    const ua = req?.headers?.["user-agent"];
    return {
      userAgent: typeof ua === "string" ? ua : null,
      ip: typeof req?.ip === "string" ? req.ip : null,
    };
  }
}
