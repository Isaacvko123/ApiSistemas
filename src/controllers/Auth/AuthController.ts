import type { Request, Response } from "express";
import type { AccessClaims } from "../../seguridad/jwt";
import { AuditAction } from "@prisma/client";
import { SesionesService } from "../../seguridad/sesiones.service";
import { prisma } from "../../db/prisma";
import { verifyPassword } from "../../seguridad/hash";
import { loginSchema, refreshSchema } from "../../models/Auth/AuthModel";
import { toUsuarioPublic } from "../../models/Usuario/UsuarioModel";
import { writeAuditLog } from "../../seguridad/audit";

function getUser(req: Request, res: Response): AccessClaims | null {
  const user = res.locals.user as AccessClaims | undefined;
  if (!user) {
    res.status(401).json({ error: "no autorizado" });
    return null;
  }
  return user;
}

export class AuthController {
  static async login(req: Request, res: Response) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "payload inválido", details: parsed.error.flatten() });
    }

    const meta = SesionesService.extraerMeta(req);

    const usuario = await prisma.usuario.findUnique({
      where: { email: parsed.data.email },
    });

    if (!usuario) {
      void writeAuditLog({
        action: AuditAction.LOGIN_FAILED,
        targetType: "Usuario",
        targetId: parsed.data.email,
        metadata: { reason: "user_not_found" },
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      });
      return res.status(401).json({ error: "credenciales inválidas" });
    }

    if (!usuario.activo) {
      void writeAuditLog({
        action: AuditAction.LOGIN_FAILED,
        actorId: usuario.id,
        targetType: "Usuario",
        targetId: String(usuario.id),
        metadata: { reason: "inactive" },
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      });
      return res.status(403).json({ error: "usuario inactivo" });
    }

    const ok = await verifyPassword(usuario.contrasena, parsed.data.contrasena);
    if (!ok) {
      void writeAuditLog({
        action: AuditAction.LOGIN_FAILED,
        actorId: usuario.id,
        targetType: "Usuario",
        targetId: String(usuario.id),
        metadata: { reason: "invalid_password" },
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      });
      return res.status(401).json({ error: "credenciales inválidas" });
    }

    const tokens = await SesionesService.crearSesionYEmitirTokens({
      usuarioId: usuario.id,
      rol: usuario.rol as AccessClaims["rol"],
      tokenVersion: usuario.tokenVersion,
      meta,
    });

    void writeAuditLog({
      action: AuditAction.LOGIN_SUCCESS,
      actorId: usuario.id,
      targetType: "Usuario",
      targetId: String(usuario.id),
      metadata: { email: usuario.email },
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    });

    return res.status(200).json({
      ...tokens,
      usuario: toUsuarioPublic(usuario),
    });
  }

  static async refresh(req: Request, res: Response) {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "payload inválido", details: parsed.error.flatten() });
    }

    const meta = SesionesService.extraerMeta(req);
    const tokens = await SesionesService.refrescarTokens({
      refreshToken: parsed.data.refreshToken,
      meta,
    });

    return res.status(200).json(tokens);
  }

  static async logout(_req: Request, res: Response) {
    const user = getUser(_req, res);
    if (!user) return;

    await SesionesService.revocarSesion(user.sid);
    void writeAuditLog({
      action: AuditAction.LOGOUT,
      actorId: Number(user.sub),
      targetType: "Sesion",
      targetId: user.sid,
    });
    return res.sendStatus(204);
  }

  static async logoutAll(_req: Request, res: Response) {
    const user = getUser(_req, res);
    if (!user) return;

    const usuarioId = Number(user.sub);
    if (!Number.isFinite(usuarioId)) {
      return res.status(400).json({ error: "usuario inválido" });
    }

    await SesionesService.revocarTodasLasSesionesDeUsuario({
      usuarioId,
      incrementarTokenVersion: true,
    });

    void writeAuditLog({
      action: AuditAction.LOGOUT_ALL,
      actorId: usuarioId,
      targetType: "Usuario",
      targetId: String(usuarioId),
    });

    return res.sendStatus(204);
  }
}
