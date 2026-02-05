import type { Request, Response } from "express";
import { Prisma, AuditAction } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import {
  resguardoCreateSchema,
  resguardoUpdateSchema,
  toResguardoCreateData,
  toResguardoPublic,
  toResguardoUpdateData,
} from "../../models/Resguardo/ResguardoModel";
import { auditEntity } from "../../seguridad/audit-helpers";
import { parsePagination } from "../../utils/pagination";
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
      return respondError(res, "resguardo_no_encontrado");
    }
    if (error.code === "P2003") {
      return respondError(res, "relacion_invalida", { field: error.meta?.field_name });
    }
  }

  return respondError(res, "error_interno", isSandbox ? { error } : undefined);
}

export class ResguardoController {
  static async listar(req: Request, res: Response) {
    try {
      const empleadoId =
        typeof req.query.empleadoId === "string" ? Number(req.query.empleadoId) : undefined;
      const localidadId =
        typeof req.query.localidadId === "string" ? Number(req.query.localidadId) : undefined;
      const estado = typeof req.query.estado === "string" ? req.query.estado : undefined;
      const { page, pageSize, skip, take } = parsePagination(req.query);

      const resguardos = await prisma.resguardo.findMany({
        where: {
          ...(Number.isFinite(empleadoId) ? { empleadoId } : {}),
          ...(Number.isFinite(localidadId) ? { localidadId } : {}),
          ...(estado ? { estado: estado as any } : {}),
        },
        orderBy: { id: "desc" },
        skip,
        take,
      });

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_READ,
        targetType: "Resguardo",
        targetId: "list",
        metadata: { page, pageSize, empleadoId, localidadId, estado, count: resguardos.length },
      });

      return res.status(200).json(resguardos.map(toResguardoPublic));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async obtener(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const resguardo = await prisma.resguardo.findUnique({ where: { id } });
      if (!resguardo) return respondError(res, "resguardo_no_encontrado");

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_READ,
        targetType: "Resguardo",
        targetId: String(id),
      });

      return res.status(200).json(toResguardoPublic(resguardo));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async crear(req: Request, res: Response) {
    const parsed = resguardoCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    try {
      const data = toResguardoCreateData(parsed.data);
      const actorId = res.locals.user?.sub ? Number(res.locals.user.sub) : null;

      const resguardo = await prisma.resguardo.create({
        data: Number.isFinite(actorId as number)
          ? {
              ...data,
              creadoPor: { connect: { id: actorId as number } },
            }
          : data,
      });

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_CREATE,
        targetType: "Resguardo",
        targetId: String(resguardo.id),
      });

      return res.status(201).json(toResguardoPublic(resguardo));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async actualizar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    const parsed = resguardoUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    if (Object.keys(parsed.data).length === 0) {
      return respondError(res, "sin_cambios");
    }

    try {
      const data = toResguardoUpdateData(parsed.data);
      const resguardo = await prisma.resguardo.update({ where: { id }, data });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_UPDATE,
        targetType: "Resguardo",
        targetId: String(id),
        metadata: { fields: Object.keys(parsed.data) },
      });
      return res.status(200).json(toResguardoPublic(resguardo));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async eliminar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const resguardo = await prisma.resguardo.update({
        where: { id },
        data: { estado: "CANCELADO" },
      });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_DELETE,
        targetType: "Resguardo",
        targetId: String(id),
      });
      return res.status(200).json(toResguardoPublic(resguardo));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }
}
