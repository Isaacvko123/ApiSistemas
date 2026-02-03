import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import {
  auditLogFilterSchema,
  toAuditLogPublic,
} from "../../models/AuditLog/AuditLogModel";
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
      return respondError(res, "audit_no_encontrado");
    }
  }

  return respondError(res, "error_interno", isSandbox ? { error } : undefined);
}

export class AuditLogController {
  static async listar(req: Request, res: Response) {
    const parsed = auditLogFilterSchema.safeParse({
      action: typeof req.query.action === "string" ? req.query.action : undefined,
      actorId:
        typeof req.query.actorId === "string" ? Number(req.query.actorId) : undefined,
      targetType: typeof req.query.targetType === "string" ? req.query.targetType : undefined,
      targetId: typeof req.query.targetId === "string" ? req.query.targetId : undefined,
      dateFrom: typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined,
      dateTo: typeof req.query.dateTo === "string" ? req.query.dateTo : undefined,
    });

    if (!parsed.success) {
      return respondError(res, "filtro_invalido", parsed.error.flatten());
    }

    try {
      const { action, actorId, targetType, targetId, dateFrom, dateTo } = parsed.data;
      const takeRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
      const take = Number.isFinite(takeRaw) ? Math.min(takeRaw as number, 500) : 200;

      const logs = await prisma.auditLog.findMany({
        where: {
          ...(action ? { action } : {}),
          ...(actorId ? { actorId } : {}),
          ...(targetType ? { targetType } : {}),
          ...(targetId ? { targetId } : {}),
          ...(dateFrom || dateTo
            ? {
                createdAt: {
                  ...(dateFrom ? { gte: dateFrom } : {}),
                  ...(dateTo ? { lte: dateTo } : {}),
                },
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take,
      });

      return res.status(200).json(logs.map(toAuditLogPublic));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async obtener(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const log = await prisma.auditLog.findUnique({ where: { id } });
      if (!log) return respondError(res, "audit_no_encontrado");

      return res.status(200).json(toAuditLogPublic(log));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }
}
