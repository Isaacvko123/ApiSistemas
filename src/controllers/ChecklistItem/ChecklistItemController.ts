import type { Request, Response } from "express";
import { Prisma, AuditAction } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import {
  checklistItemCreateSchema,
  checklistItemUpdateSchema,
  toChecklistItemCreateData,
  toChecklistItemPublic,
  toChecklistItemUpdateData,
} from "../../models/ChecklistItem/ChecklistItemModel";
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
    if (error.code === "P2025") {
      return respondError(res, "item_no_encontrado");
    }
    if (error.code === "P2003") {
      return respondError(res, "relacion_invalida", { field: error.meta?.field_name });
    }
  }

  return respondError(res, "error_interno", isSandbox ? { error } : undefined);
}

export class ChecklistItemController {
  static async listar(req: Request, res: Response) {
    try {
      const checklistId =
        typeof req.query.checklistId === "string" ? Number(req.query.checklistId) : undefined;

      const items = await prisma.checklistItem.findMany({
        where: {
          ...(Number.isFinite(checklistId) ? { checklistId } : {}),
        },
        orderBy: { id: "desc" },
      });

      return res.status(200).json(items.map(toChecklistItemPublic));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async obtener(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const item = await prisma.checklistItem.findUnique({ where: { id } });
      if (!item) return respondError(res, "item_no_encontrado");

      return res.status(200).json(toChecklistItemPublic(item));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async crear(req: Request, res: Response) {
    const parsed = checklistItemCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    try {
      const data = toChecklistItemCreateData(parsed.data);
      const item = await prisma.checklistItem.create({ data });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_CREATE,
        targetType: "ChecklistItem",
        targetId: String(item.id),
      });
      return res.status(201).json(toChecklistItemPublic(item));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async actualizar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    const parsed = checklistItemUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    if (Object.keys(parsed.data).length === 0) {
      return respondError(res, "sin_cambios");
    }

    try {
      const data = toChecklistItemUpdateData(parsed.data);
      const item = await prisma.checklistItem.update({ where: { id }, data });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_UPDATE,
        targetType: "ChecklistItem",
        targetId: String(id),
        metadata: { fields: Object.keys(parsed.data) },
      });
      return res.status(200).json(toChecklistItemPublic(item));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async eliminar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const item = await prisma.checklistItem.delete({ where: { id } });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_DELETE,
        targetType: "ChecklistItem",
        targetId: String(id),
      });
      return res.status(200).json(toChecklistItemPublic(item));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }
}
