import type { Request, Response } from "express";
import { Prisma, AuditAction } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import {
  equipoCreateSchema,
  equipoUpdateSchema,
  toEquipoCreateData,
  toEquipoPublic,
  toEquipoUpdateData,
} from "../../models/Equipo/EquipoModel";
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
      return respondError(res, "equipo_no_encontrado");
    }
    if (error.code === "P2003") {
      return respondError(res, "relacion_invalida", { field: error.meta?.field_name });
    }
  }

  return respondError(res, "error_interno", isSandbox ? { error } : undefined);
}

export class EquipoController {
  static async listar(req: Request, res: Response) {
    try {
      const tipoEquipoId =
        typeof req.query.tipoEquipoId === "string" ? Number(req.query.tipoEquipoId) : undefined;
      const estado = typeof req.query.estado === "string" ? req.query.estado : undefined;
      const localidadId =
        typeof req.query.localidadId === "string" ? Number(req.query.localidadId) : undefined;
      const { page, pageSize, skip, take } = parsePagination(req.query);

      const equipos = await prisma.equipo.findMany({
        where: {
          ...(Number.isFinite(tipoEquipoId) ? { tipoEquipoId } : {}),
          ...(estado ? { estado: estado as any } : {}),
          ...(Number.isFinite(localidadId) ? { localidadId } : {}),
        },
        orderBy: { id: "desc" },
        skip,
        take,
      });

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_READ,
        targetType: "Equipo",
        targetId: "list",
        metadata: { page, pageSize, tipoEquipoId, estado, localidadId, count: equipos.length },
      });

      return res.status(200).json(equipos.map(toEquipoPublic));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async obtener(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const equipo = await prisma.equipo.findUnique({ where: { id } });
      if (!equipo) return respondError(res, "equipo_no_encontrado");

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_READ,
        targetType: "Equipo",
        targetId: String(id),
      });

      return res.status(200).json(toEquipoPublic(equipo));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async crear(req: Request, res: Response) {
    const parsed = equipoCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    try {
      const data = toEquipoCreateData(parsed.data);
      const equipo = await prisma.equipo.create({ data });

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_CREATE,
        targetType: "Equipo",
        targetId: String(equipo.id),
      });

      return res.status(201).json(toEquipoPublic(equipo));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async actualizar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    const parsed = equipoUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    if (Object.keys(parsed.data).length === 0) {
      return respondError(res, "sin_cambios");
    }

    try {
      const data = toEquipoUpdateData(parsed.data);
      const equipo = await prisma.equipo.update({ where: { id }, data });

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_UPDATE,
        targetType: "Equipo",
        targetId: String(id),
        metadata: { fields: Object.keys(parsed.data) },
      });

      return res.status(200).json(toEquipoPublic(equipo));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async eliminar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const equipo = await prisma.equipo.update({
        where: { id },
        data: { estado: "BAJA" },
      });

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_DELETE,
        targetType: "Equipo",
        targetId: String(id),
      });

      return res.status(200).json(toEquipoPublic(equipo));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }
}
