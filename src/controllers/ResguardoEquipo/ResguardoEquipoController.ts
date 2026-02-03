import type { Request, Response } from "express";
import { Prisma, AuditAction } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import {
  resguardoEquipoCreateSchema,
  resguardoEquipoUpdateSchema,
  toResguardoEquipoCreateData,
  toResguardoEquipoPublic,
  toResguardoEquipoUpdateData,
} from "../../models/ResguardoEquipo/ResguardoEquipoModel";
import { auditEntity } from "../../seguridad/audit-helpers";
import errores from "./errores.json";

const isSandbox = env.nodeEnv !== "production";

type ErrorKey = keyof typeof errores;

function respondError(res: Response, key: ErrorKey, details?: unknown) {
  const entry = errores[key];
  if (!entry) return res.sendStatus(500);

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
      return respondError(res, "resguardo_equipo_no_encontrado");
    }
    if (error.code === "P2003") {
      return respondError(res, "relacion_invalida", { field: error.meta?.field_name });
    }
  }

  return respondError(res, "error_interno", isSandbox ? { error } : undefined);
}

export class ResguardoEquipoController {
  static async listar(req: Request, res: Response) {
    try {
      const resguardoId =
        typeof req.query.resguardoId === "string" ? Number(req.query.resguardoId) : undefined;
      const equipoId = typeof req.query.equipoId === "string" ? Number(req.query.equipoId) : undefined;

      const rows = await prisma.resguardoEquipo.findMany({
        where: {
          ...(Number.isFinite(resguardoId) ? { resguardoId } : {}),
          ...(Number.isFinite(equipoId) ? { equipoId } : {}),
        },
        orderBy: { id: "desc" },
      });

      return res.status(200).json(rows.map(toResguardoEquipoPublic));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async obtener(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const row = await prisma.resguardoEquipo.findUnique({ where: { id } });
      if (!row) return respondError(res, "resguardo_equipo_no_encontrado");

      return res.status(200).json(toResguardoEquipoPublic(row));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async crear(req: Request, res: Response) {
    const parsed = resguardoEquipoCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    try {
      const data = toResguardoEquipoCreateData(parsed.data);
      const row = await prisma.resguardoEquipo.create({ data });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_CREATE,
        targetType: "ResguardoEquipo",
        targetId: String(row.id),
      });
      return res.status(201).json(toResguardoEquipoPublic(row));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async actualizar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    const parsed = resguardoEquipoUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    if (Object.keys(parsed.data).length === 0) {
      return respondError(res, "sin_cambios");
    }

    try {
      const data = toResguardoEquipoUpdateData(parsed.data);
      const row = await prisma.resguardoEquipo.update({ where: { id }, data });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_UPDATE,
        targetType: "ResguardoEquipo",
        targetId: String(id),
        metadata: { fields: Object.keys(parsed.data) },
      });
      return res.status(200).json(toResguardoEquipoPublic(row));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async eliminar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const row = await prisma.resguardoEquipo.delete({ where: { id } });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_DELETE,
        targetType: "ResguardoEquipo",
        targetId: String(id),
      });
      return res.status(200).json(toResguardoEquipoPublic(row));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }
}
