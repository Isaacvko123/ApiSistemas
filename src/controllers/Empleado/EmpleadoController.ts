import type { Request, Response } from "express";
import { Prisma, AuditAction } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import {
  empleadoCreateSchema,
  empleadoUpdateSchema,
  toEmpleadoCreateData,
  toEmpleadoPublic,
  toEmpleadoUpdateData,
} from "../../models/Empleado/EmpleadoModel";
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
    if (error.code === "P2002") {
      return respondError(res, "duplicado", { target: error.meta?.target });
    }
    if (error.code === "P2025") {
      return respondError(res, "empleado_no_encontrado");
    }
    if (error.code === "P2003") {
      return respondError(res, "relacion_invalida", { field: error.meta?.field_name });
    }
  }

  return respondError(res, "error_interno", isSandbox ? { error } : undefined);
}

export class EmpleadoController {
  static async listar(req: Request, res: Response) {
    try {
      const activo =
        typeof req.query.activo === "string" ? req.query.activo === "true" : undefined;
      const areaId = typeof req.query.areaId === "string" ? Number(req.query.areaId) : undefined;
      const puestoId =
        typeof req.query.puestoId === "string" ? Number(req.query.puestoId) : undefined;
      const localidadId =
        typeof req.query.localidadId === "string" ? Number(req.query.localidadId) : undefined;

      const empleados = await prisma.empleado.findMany({
        where: {
          ...(typeof activo === "boolean" ? { activo } : {}),
          ...(Number.isFinite(areaId) ? { areaId } : {}),
          ...(Number.isFinite(puestoId) ? { puestoId } : {}),
          ...(Number.isFinite(localidadId) ? { localidadId } : {}),
        },
        orderBy: { id: "desc" },
      });

      return res.status(200).json(empleados.map(toEmpleadoPublic));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async obtener(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const empleado = await prisma.empleado.findUnique({ where: { id } });
      if (!empleado) return respondError(res, "empleado_no_encontrado");

      return res.status(200).json(toEmpleadoPublic(empleado));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async crear(req: Request, res: Response) {
    const parsed = empleadoCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    try {
      const data = toEmpleadoCreateData(parsed.data);
      const empleado = await prisma.empleado.create({ data });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_CREATE,
        targetType: "Empleado",
        targetId: String(empleado.id),
      });
      return res.status(201).json(toEmpleadoPublic(empleado));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async actualizar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    const parsed = empleadoUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    if (Object.keys(parsed.data).length === 0) {
      return respondError(res, "sin_cambios");
    }

    try {
      const data = toEmpleadoUpdateData(parsed.data);
      const empleado = await prisma.empleado.update({ where: { id }, data });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_UPDATE,
        targetType: "Empleado",
        targetId: String(id),
        metadata: { fields: Object.keys(parsed.data) },
      });
      return res.status(200).json(toEmpleadoPublic(empleado));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async eliminar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const empleado = await prisma.empleado.update({
        where: { id },
        data: { activo: false },
      });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_DELETE,
        targetType: "Empleado",
        targetId: String(id),
      });
      return res.status(200).json(toEmpleadoPublic(empleado));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }
}
