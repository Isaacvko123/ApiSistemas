import type { Request, Response } from "express";
import { Prisma, AuditAction } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import {
  wifiCredencialCreateSchema,
  wifiCredencialUpdateSchema,
  toWifiCredencialCreateData,
  toWifiCredencialPublic,
  toWifiCredencialUpdateData,
} from "../../models/WifiCredencial/WifiCredencialModel";
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
      return respondError(res, "credencial_no_encontrada");
    }
    if (error.code === "P2003") {
      return respondError(res, "relacion_invalida", { field: error.meta?.field_name });
    }
  }

  return respondError(res, "error_interno", isSandbox ? { error } : undefined);
}

export class WifiCredencialController {
  static async listar(req: Request, res: Response) {
    try {
      const vigente =
        typeof req.query.vigente === "string" ? req.query.vigente === "true" : undefined;
      const empleadoId =
        typeof req.query.empleadoId === "string" ? Number(req.query.empleadoId) : undefined;
      const localidadId =
        typeof req.query.localidadId === "string" ? Number(req.query.localidadId) : undefined;
      const ssid = typeof req.query.ssid === "string" ? req.query.ssid : undefined;

      const rows = await prisma.wifiCredencial.findMany({
        where: {
          ...(typeof vigente === "boolean" ? { vigente } : {}),
          ...(Number.isFinite(empleadoId) ? { empleadoId } : {}),
          ...(Number.isFinite(localidadId) ? { localidadId } : {}),
          ...(ssid ? { ssid } : {}),
        },
        orderBy: { id: "desc" },
      });

      return res.status(200).json(rows.map((row) => toWifiCredencialPublic(row)));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async obtener(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const row = await prisma.wifiCredencial.findUnique({ where: { id } });
      if (!row) return respondError(res, "credencial_no_encontrada");

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_READ,
        targetType: "WifiCredencial",
        targetId: String(id),
      });

      return res.status(200).json(toWifiCredencialPublic(row));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async obtenerSecreto(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const row = await prisma.wifiCredencial.findUnique({ where: { id } });
      if (!row) return respondError(res, "credencial_no_encontrada");

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_READ_SECRET,
        targetType: "WifiCredencial",
        targetId: String(id),
      });

      return res.status(200).json(toWifiCredencialPublic(row, true));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async crear(req: Request, res: Response) {
    const parsed = wifiCredencialCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    try {
      const data = toWifiCredencialCreateData(parsed.data);
      const row = await prisma.wifiCredencial.create({ data });

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_CREATE,
        targetType: "WifiCredencial",
        targetId: String(row.id),
      });

      return res.status(201).json(toWifiCredencialPublic(row));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async actualizar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    const parsed = wifiCredencialUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    if (Object.keys(parsed.data).length === 0) {
      return respondError(res, "sin_cambios");
    }

    try {
      const data = toWifiCredencialUpdateData(parsed.data);
      const row = await prisma.wifiCredencial.update({ where: { id }, data });

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_UPDATE,
        targetType: "WifiCredencial",
        targetId: String(id),
        metadata: { fields: Object.keys(parsed.data) },
      });

      return res.status(200).json(toWifiCredencialPublic(row));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async eliminar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const row = await prisma.wifiCredencial.update({
        where: { id },
        data: { vigente: false },
      });

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_DELETE,
        targetType: "WifiCredencial",
        targetId: String(id),
      });

      return res.status(200).json(toWifiCredencialPublic(row));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }
}
