import type { Request, Response } from "express";
import { Prisma, AuditAction } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import {
  documentoCreateSchema,
  documentoUpdateSchema,
  toDocumentoCreateData,
  toDocumentoPublic,
  toDocumentoUpdateData,
} from "../../models/Documento/DocumentoModel";
import { auditEntity } from "../../seguridad/audit-helpers";
import { buildDocumentoRuta } from "../../middlewares/upload";
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
      const empleadoId =
        typeof req.query.empleadoId === "string" ? Number(req.query.empleadoId) : undefined;
      const evento = typeof req.query.evento === "string" ? req.query.evento : undefined;

      const documentos = await prisma.documento.findMany({
        where: {
          ...(Number.isFinite(equipoId) ? { equipoId } : {}),
          ...(Number.isFinite(resguardoId) ? { resguardoId } : {}),
          ...(Number.isFinite(resguardoEquipoId) ? { resguardoEquipoId } : {}),
          ...(tipo ? { tipo: tipo as any } : {}),
          ...(Number.isFinite(empleadoId) ? { empleadoId } : {}),
          ...(evento ? { evento: evento as any } : {}),
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
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_CREATE,
        targetType: "Documento",
        targetId: String(doc.id),
      });
      return res.status(201).json(toDocumentoPublic(doc));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async subir(req: Request, res: Response) {
    const file = req.file as
      | { filename: string; originalname: string; mimetype: string; size: number }
      | undefined;
    if (!file) {
      return respondError(res, "payload_invalido", { reason: "archivo requerido" });
    }

    const equipoId = typeof req.body.equipoId === "string" ? Number(req.body.equipoId) : undefined;
    const resguardoId =
      typeof req.body.resguardoId === "string" ? Number(req.body.resguardoId) : undefined;
    const resguardoEquipoId =
      typeof req.body.resguardoEquipoId === "string"
        ? Number(req.body.resguardoEquipoId)
        : undefined;
    const tipo = typeof req.body.tipo === "string" ? req.body.tipo : undefined;
    const evento = typeof req.body.evento === "string" ? req.body.evento : undefined;
    const empleadoId =
      typeof req.body.empleadoId === "string" ? Number(req.body.empleadoId) : undefined;

    const actorId = res.locals.user?.sub ? Number(res.locals.user.sub) : null;

    const parsed = documentoCreateSchema.safeParse({
      tipo,
      ruta: buildDocumentoRuta(file.filename),
      nombreArchivo: file.originalname,
      mime: file.mimetype,
      sizeBytes: file.size,
      equipoId: Number.isFinite(equipoId) ? (equipoId as number) : undefined,
      resguardoId: Number.isFinite(resguardoId) ? (resguardoId as number) : undefined,
      resguardoEquipoId: Number.isFinite(resguardoEquipoId)
        ? (resguardoEquipoId as number)
        : undefined,
      empleadoId: Number.isFinite(empleadoId) ? (empleadoId as number) : undefined,
      evento,
      subidoPorId: Number.isFinite(actorId as number) ? (actorId as number) : undefined,
    });

    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    try {
      const data = toDocumentoCreateData(parsed.data);
      const doc = await prisma.documento.create({ data });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_CREATE,
        targetType: "Documento",
        targetId: String(doc.id),
      });
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
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_UPDATE,
        targetType: "Documento",
        targetId: String(id),
        metadata: { fields: Object.keys(parsed.data) },
      });
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
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_DELETE,
        targetType: "Documento",
        targetId: String(id),
      });
      return res.status(200).json(toDocumentoPublic(doc));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }
}
