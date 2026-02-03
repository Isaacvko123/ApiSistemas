import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import {
  areaCreateSchema,
  areaUpdateSchema,
  toAreaPublic,
} from "../../models/Area/AreaModel";
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
      return respondError(res, "area_no_encontrada");
    }
    if (error.code === "P2003") {
      return respondError(res, "relacion_invalida", { field: error.meta?.field_name });
    }
  }

  return respondError(res, "error_interno", isSandbox ? { error } : undefined);
}

export class AreaController {
  static async listar(_req: Request, res: Response) {
    try {
      const areas = await prisma.area.findMany({
        orderBy: { id: "desc" },
      });

      return res.status(200).json(areas.map(toAreaPublic));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async obtener(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const area = await prisma.area.findUnique({ where: { id } });
      if (!area) return respondError(res, "area_no_encontrada");

      return res.status(200).json(toAreaPublic(area));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async crear(req: Request, res: Response) {
    const parsed = areaCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    try {
      const area = await prisma.area.create({ data: parsed.data });
      return res.status(201).json(toAreaPublic(area));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async actualizar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    const parsed = areaUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    if (Object.keys(parsed.data).length === 0) {
      return respondError(res, "sin_cambios");
    }

    try {
      const area = await prisma.area.update({ where: { id }, data: parsed.data });
      return res.status(200).json(toAreaPublic(area));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async eliminar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const area = await prisma.area.delete({ where: { id } });
      return res.status(200).json(toAreaPublic(area));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }
}
