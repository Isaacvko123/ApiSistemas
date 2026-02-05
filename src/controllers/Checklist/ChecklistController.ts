import type { Request, Response } from "express";
import { Prisma, AuditAction } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import {
  checklistCreateSchema,
  checklistUpdateSchema,
  toChecklistCreateData,
  toChecklistPublic,
  toChecklistUpdateData,
} from "../../models/Checklist/ChecklistModel";
import { auditEntity } from "../../seguridad/audit-helpers";
import { parsePagination } from "../../utils/pagination";
import { respondList } from "../../utils/respond";
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
      return respondError(res, "checklist_no_encontrado");
    }
    if (error.code === "P2003") {
      return respondError(res, "relacion_invalida", { field: error.meta?.field_name });
    }
  }

  return respondError(res, "error_interno", isSandbox ? { error } : undefined);
}

export class ChecklistController {
  static async listar(req: Request, res: Response) {
    try {
      const puestoId = typeof req.query.puestoId === "string" ? Number(req.query.puestoId) : undefined;
      const nombre = typeof req.query.nombre === "string" ? req.query.nombre : undefined;
      const { page, pageSize, skip, take } = parsePagination(req.query);

      const checklists = await prisma.checklist.findMany({
        where: {
          ...(Number.isFinite(puestoId) ? { puestoId } : {}),
          ...(nombre
            ? { nombre: { contains: nombre, mode: "insensitive" } }
            : {}),
        },
        orderBy: { id: "desc" },
        skip,
        take,
      });

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_READ,
        targetType: "Checklist",
        targetId: "list",
        metadata: { page, pageSize, puestoId, nombre, count: checklists.length },
      });

      return respondList(req, res, checklists.map(toChecklistPublic), {
        page,
        pageSize,
        puestoId,
        nombre,
        count: checklists.length,
      });
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async obtener(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const checklist = await prisma.checklist.findUnique({ where: { id } });
      if (!checklist) return respondError(res, "checklist_no_encontrado");

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_READ,
        targetType: "Checklist",
        targetId: String(id),
      });

      return res.status(200).json(toChecklistPublic(checklist));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async crear(req: Request, res: Response) {
    const parsed = checklistCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    try {
      const data = toChecklistCreateData(parsed.data);
      const checklist = await prisma.checklist.create({ data });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_CREATE,
        targetType: "Checklist",
        targetId: String(checklist.id),
      });
      return res.status(201).json(toChecklistPublic(checklist));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async actualizar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    const parsed = checklistUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    if (Object.keys(parsed.data).length === 0) {
      return respondError(res, "sin_cambios");
    }

    try {
      const data = toChecklistUpdateData(parsed.data);
      const checklist = await prisma.checklist.update({ where: { id }, data });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_UPDATE,
        targetType: "Checklist",
        targetId: String(id),
        metadata: { fields: Object.keys(parsed.data) },
      });
      return res.status(200).json(toChecklistPublic(checklist));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async eliminar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const itemsCount = await prisma.checklistItem.count({ where: { checklistId: id } });
      if (itemsCount > 0) {
        return respondError(res, "relacion_invalida", { items: itemsCount });
      }

      const checklist = await prisma.checklist.delete({ where: { id } });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_DELETE,
        targetType: "Checklist",
        targetId: String(id),
      });
      return res.status(200).json(toChecklistPublic(checklist));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }
}
