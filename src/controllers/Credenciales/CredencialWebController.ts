import type { Request, Response } from "express";
import { Prisma, AuditAction } from "@prisma/client";
import { prisma } from "../../db/prisma";
import {
  credencialWebCreateSchema,
  credencialWebUpdateSchema,
  toCredencialWebCreateData,
  toCredencialWebPublic,
  toCredencialWebUpdateData,
} from "../../models/Credenciales/CredencialWebModel";
import { writeAuditLog } from "../../seguridad/audit";
import { SesionesService } from "../../seguridad/sesiones.service";

function parseId(raw: unknown): number | null {
  const value = typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(value) ? value : null;
}

function handlePrismaError(res: Response, error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "registro duplicado" });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "registro no encontrado" });
    }
  }
  return res.status(500).json({ error: "error interno" });
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

      const credenciales = await prisma.credencialWeb.findMany({
        where: {
          ...(typeof activo === "boolean" ? { activo } : {}),
          ...(Number.isFinite(empleadoId) ? { empleadoId } : {}),
          ...(Number.isFinite(areaId) ? { areaId } : {}),
          ...(Number.isFinite(puestoId) ? { puestoId } : {}),
        },
        orderBy: { id: "desc" },
      });

      return res.status(200).json(credenciales.map((c) => toCredencialWebPublic(c)));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async obtener(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "id inválido" });

    try {
      const credencial = await prisma.credencialWeb.findUnique({ where: { id } });
      if (!credencial) return res.status(404).json({ error: "credencial no encontrada" });

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
    if (!id) return res.status(400).json({ error: "id inválido" });

    try {
      const credencial = await prisma.credencialWeb.findUnique({ where: { id } });
      if (!credencial) return res.status(404).json({ error: "credencial no encontrada" });

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
      return res.status(400).json({ error: "payload inválido", details: parsed.error.flatten() });
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
    if (!id) return res.status(400).json({ error: "id inválido" });

    const parsed = credencialWebUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "payload inválido", details: parsed.error.flatten() });
    }

    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ error: "sin cambios" });
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
    if (!id) return res.status(400).json({ error: "id inválido" });

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
