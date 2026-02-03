import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import {
  checklistCreateSchema,
  checklistUpdateSchema,
  toChecklistCreateData,
  toChecklistPublic,
  toChecklistUpdateData,
} from "../../models/Checklist/ChecklistModel";
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

      const checklists = await prisma.checklist.findMany({
        where: {
          ...(Number.isFinite(puestoId) ? { puestoId } : {}),
        },
        orderBy: { id: "desc" },
      });

      return res.status(200).json(checklists.map(toChecklistPublic));
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
      return res.status(200).json(toChecklistPublic(checklist));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async eliminar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const checklist = await prisma.checklist.delete({ where: { id } });
      return res.status(200).json(toChecklistPublic(checklist));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }
}
