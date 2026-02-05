import type { Request, Response } from "express";
import { Prisma, AuditAction } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import {
  toUsuarioCreateData,
  toUsuarioPublic,
  toUsuarioUpdateData,
  usuarioCreateSchema,
  usuarioUpdateSchema,
} from "../../models/Usuario/UsuarioModel";
import errores from "./errores.json";
import { writeAuditLog } from "../../seguridad/audit";
import { SesionesService } from "../../seguridad/sesiones.service";
import { auditEntity } from "../../seguridad/audit-helpers";
import { parsePagination } from "../../utils/pagination";

const allowedRoles = new Set(["ADMIN", "SUPERVISOR", "GERENTE"]);
const isSandbox = env.nodeEnv !== "production";

type ErrorKey = keyof typeof errores;

function respondError(res: Response, key: ErrorKey, details?: unknown) {
  const entry = errores[key];
  if (!entry) {
    return res.sendStatus(500);
  }

  if (!isSandbox) {
    return res.sendStatus(entry.status);
  }

  return res.status(entry.status).json({
    ...entry,
    details,
  });
}

function parseId(raw: unknown): number | null {
  const value = typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(value) ? value : null;
}

function handlePrismaError(res: Response, error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return respondError(res, "duplicado", { target: error.meta?.target });
    }
    if (error.code === "P2025") {
      return respondError(res, "usuario_no_encontrado");
    }
  }
  return respondError(res, "error_interno", isSandbox ? { error } : undefined);
}

export class UsuarioController {
  static async listar(req: Request, res: Response) {
    try {
      const activo =
        typeof req.query.activo === "string" ? req.query.activo === "true" : undefined;
      const rol = typeof req.query.rol === "string" ? req.query.rol : undefined;
      const { page, pageSize, skip, take } = parsePagination(req.query);

      if (rol && !allowedRoles.has(rol)) {
        return respondError(res, "rol_invalido", { allowed: [...allowedRoles] });
      }

      const usuarios = await prisma.usuario.findMany({
        where: {
          ...(typeof activo === "boolean" ? { activo } : {}),
          ...(rol ? { rol: rol as any } : {}),
        },
        orderBy: { id: "desc" },
        skip,
        take,
      });

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_READ,
        targetType: "Usuario",
        targetId: "list",
        metadata: { page, pageSize, activo, rol, count: usuarios.length },
      });

      return res.status(200).json(usuarios.map(toUsuarioPublic));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async obtener(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const usuario = await prisma.usuario.findUnique({ where: { id } });
      if (!usuario) return respondError(res, "usuario_no_encontrado");

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_READ,
        targetType: "Usuario",
        targetId: String(id),
      });

      return res.status(200).json(toUsuarioPublic(usuario));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async crear(req: Request, res: Response) {
    const parsed = usuarioCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    try {
      const existing = await prisma.usuario.findUnique({
        where: { email: parsed.data.email },
        select: { id: true },
      });
      if (existing) {
        return respondError(res, "duplicado", { target: ["email"] });
      }

      const data = await toUsuarioCreateData(parsed.data);
      const usuario = await prisma.usuario.create({ data });
      const meta = SesionesService.extraerMeta(req);
      const actorId = res.locals.user?.sub ? Number(res.locals.user.sub) : null;
      await writeAuditLog({
        action: AuditAction.USUARIO_CREATE,
        actorId: Number.isFinite(actorId as number) ? (actorId as number) : null,
        targetType: "Usuario",
        targetId: String(usuario.id),
        metadata: { email: usuario.email },
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      });
      return res.status(201).json(toUsuarioPublic(usuario));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async actualizar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    const parsed = usuarioUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    if (Object.keys(parsed.data).length === 0) {
      return respondError(res, "sin_cambios");
    }

    try {
      const data = await toUsuarioUpdateData(parsed.data);
      const usuario = await prisma.usuario.update({ where: { id }, data });
      const meta = SesionesService.extraerMeta(req);
      const actorId = res.locals.user?.sub ? Number(res.locals.user.sub) : null;
      await writeAuditLog({
        action: AuditAction.USUARIO_UPDATE,
        actorId: Number.isFinite(actorId as number) ? (actorId as number) : null,
        targetType: "Usuario",
        targetId: String(usuario.id),
        metadata: { fields: Object.keys(parsed.data) },
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      });
      return res.status(200).json(toUsuarioPublic(usuario));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async desactivar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const usuario = await prisma.usuario.update({
        where: { id },
        data: { activo: false },
      });
      const meta = SesionesService.extraerMeta(req);
      const actorId = res.locals.user?.sub ? Number(res.locals.user.sub) : null;
      await writeAuditLog({
        action: AuditAction.USUARIO_DELETE,
        actorId: Number.isFinite(actorId as number) ? (actorId as number) : null,
        targetType: "Usuario",
        targetId: String(usuario.id),
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      });
      return res.status(200).json(toUsuarioPublic(usuario));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }
}
