import type { Request, Response } from "express";
import { Prisma, AuditAction } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import {
  credencialWebCreateSchema,
  credencialWebUpdateSchema,
  toCredencialWebCreateData,
  toCredencialWebPublic,
  toCredencialWebUpdateData,
} from "../../models/Credenciales/CredencialWebModel";
import { writeAuditLog } from "../../seguridad/audit";
import { SesionesService } from "../../seguridad/sesiones.service";
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
      return respondError(res, "credencial_no_encontrada");
    }
    if (error.code === "P2003") {
      return respondError(res, "relacion_invalida", { field: error.meta?.field_name });
    }
  }
  return respondError(res, "error_interno", isSandbox ? { error } : undefined);
}

export class CredencialWebController {
  static async listar(req: Request, res: Response) {
    try {
      const activo =
        typeof req.query.activo === "string" ? req.query.activo === "true" : undefined;
      const empleadoId =
        typeof req.query.empleadoId === "string" ? Number(req.query.empleadoId) : undefined;
      const areaId =
        typeof req.query.areaId === "string" ? Number(req.query.areaId) : undefined;
      const puestoId =
        typeof req.query.puestoId === "string" ? Number(req.query.puestoId) : undefined;
      const { page, pageSize, skip, take } = parsePagination(req.query);

      const credenciales = await prisma.credencialWeb.findMany({
        where: {
          ...(typeof activo === "boolean" ? { activo } : {}),
          ...(Number.isFinite(empleadoId) ? { empleadoId } : {}),
          ...(Number.isFinite(areaId) ? { areaId } : {}),
          ...(Number.isFinite(puestoId) ? { puestoId } : {}),
        },
        orderBy: { id: "desc" },
        skip,
        take,
      });

      const meta = SesionesService.extraerMeta(req);
      const actorId = res.locals.user?.sub ? Number(res.locals.user.sub) : null;
      await writeAuditLog({
        action: AuditAction.CREDENCIAL_READ,
        actorId: Number.isFinite(actorId as number) ? (actorId as number) : null,
        targetType: "CredencialWeb",
        targetId: "list",
        metadata: {
          page,
          pageSize,
          activo,
          empleadoId,
          areaId,
          puestoId,
          count: credenciales.length,
        },
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      });

      return res.status(200).json(credenciales.map((c) => toCredencialWebPublic(c)));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async obtener(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const credencial = await prisma.credencialWeb.findUnique({ where: { id } });
      if (!credencial) return respondError(res, "credencial_no_encontrada");

      const meta = SesionesService.extraerMeta(req);
      const actorId = res.locals.user?.sub ? Number(res.locals.user.sub) : null;
      await writeAuditLog({
        action: AuditAction.CREDENCIAL_READ,
        actorId: Number.isFinite(actorId as number) ? (actorId as number) : null,
        targetType: "CredencialWeb",
        targetId: String(id),
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      });

      return res.status(200).json(toCredencialWebPublic(credencial));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async obtenerSecreto(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const credencial = await prisma.credencialWeb.findUnique({ where: { id } });
      if (!credencial) return respondError(res, "credencial_no_encontrada");

      const meta = SesionesService.extraerMeta(req);
      const actorId = res.locals.user?.sub ? Number(res.locals.user.sub) : null;
      await writeAuditLog({
        action: AuditAction.CREDENCIAL_READ_SECRET,
        actorId: Number.isFinite(actorId as number) ? (actorId as number) : null,
        targetType: "CredencialWeb",
        targetId: String(id),
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      });

      return res.status(200).json(toCredencialWebPublic(credencial, true));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async crear(req: Request, res: Response) {
    const parsed = credencialWebCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    try {
      const data = toCredencialWebCreateData(parsed.data);
      const actorId = res.locals.user?.sub ? Number(res.locals.user.sub) : null;

      const credencial = await prisma.credencialWeb.create({
        data: {
          ...data,
          ...(Number.isFinite(actorId as number)
            ? { creadoPor: { connect: { id: actorId as number } } }
            : {}),
        },
      });

      const meta = SesionesService.extraerMeta(req);
      await writeAuditLog({
        action: AuditAction.CREDENCIAL_CREATE,
        actorId: Number.isFinite(actorId as number) ? (actorId as number) : null,
        targetType: "CredencialWeb",
        targetId: String(credencial.id),
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      });

      return res.status(201).json(toCredencialWebPublic(credencial));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async actualizar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    const parsed = credencialWebUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    if (Object.keys(parsed.data).length === 0) {
      return respondError(res, "sin_cambios");
    }

    try {
      const data = toCredencialWebUpdateData(parsed.data);
      const credencial = await prisma.credencialWeb.update({ where: { id }, data });

      const meta = SesionesService.extraerMeta(req);
      const actorId = res.locals.user?.sub ? Number(res.locals.user.sub) : null;
      await writeAuditLog({
        action: AuditAction.CREDENCIAL_UPDATE,
        actorId: Number.isFinite(actorId as number) ? (actorId as number) : null,
        targetType: "CredencialWeb",
        targetId: String(id),
        metadata: { fields: Object.keys(parsed.data) },
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      });

      return res.status(200).json(toCredencialWebPublic(credencial));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async eliminar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const credencial = await prisma.credencialWeb.update({
        where: { id },
        data: { activo: false },
      });

      const meta = SesionesService.extraerMeta(req);
      const actorId = res.locals.user?.sub ? Number(res.locals.user.sub) : null;
      await writeAuditLog({
        action: AuditAction.CREDENCIAL_DELETE,
        actorId: Number.isFinite(actorId as number) ? (actorId as number) : null,
        targetType: "CredencialWeb",
        targetId: String(id),
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      });

      return res.status(200).json(toCredencialWebPublic(credencial));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }
}
