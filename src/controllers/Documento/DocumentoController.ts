import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import {
  documentoCreateSchema,
  documentoUpdateSchema,
  toDocumentoCreateData,
  toDocumentoPublic,
  toDocumentoUpdateData,
} from "../../models/Documento/DocumentoModel";
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
      return respondError(res, "documento_no_encontrado");
    }
    if (error.code === "P2003") {
      return respondError(res, "relacion_invalida", { field: error.meta?.field_name });
    }
  }

  return respondError(res, "error_interno", isSandbox ? { error } : undefined);
}

export class DocumentoController {
  static async listar(req: Request, res: Response) {
    try {
      const equipoId = typeof req.query.equipoId === "string" ? Number(req.query.equipoId) : undefined;
      const resguardoId =
        typeof req.query.resguardoId === "string" ? Number(req.query.resguardoId) : undefined;
      const resguardoEquipoId =
        typeof req.query.resguardoEquipoId === "string" ? Number(req.query.resguardoEquipoId) : undefined;
      const tipo = typeof req.query.tipo === "string" ? req.query.tipo : undefined;

      const documentos = await prisma.documento.findMany({
        where: {
          ...(Number.isFinite(equipoId) ? { equipoId } : {}),
          ...(Number.isFinite(resguardoId) ? { resguardoId } : {}),
          ...(Number.isFinite(resguardoEquipoId) ? { resguardoEquipoId } : {}),
          ...(tipo ? { tipo: tipo as any } : {}),
        },
        orderBy: { id: "desc" },
      });

      return res.status(200).json(documentos.map(toDocumentoPublic));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async obtener(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const doc = await prisma.documento.findUnique({ where: { id } });
      if (!doc) return respondError(res, "documento_no_encontrado");

      return res.status(200).json(toDocumentoPublic(doc));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async crear(req: Request, res: Response) {
    const parsed = documentoCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    try {
      const data = toDocumentoCreateData(parsed.data);
      const doc = await prisma.documento.create({ data });
      return res.status(201).json(toDocumentoPublic(doc));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async actualizar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    const parsed = documentoUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    if (Object.keys(parsed.data).length === 0) {
      return respondError(res, "sin_cambios");
    }

    try {
      const data = toDocumentoUpdateData(parsed.data);
      const doc = await prisma.documento.update({ where: { id }, data });
      return res.status(200).json(toDocumentoPublic(doc));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async eliminar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const doc = await prisma.documento.delete({ where: { id } });
      return res.status(200).json(toDocumentoPublic(doc));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }
}
