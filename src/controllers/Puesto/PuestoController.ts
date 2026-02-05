import type { Request, Response } from "express";
import { Prisma, AuditAction } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import {
  puestoCreateSchema,
  puestoUpdateSchema,
  toPuestoCreateData,
  toPuestoPublic,
  toPuestoUpdateData,
} from "../../models/Puesto/PuestoModel";
import { auditEntity } from "../../seguridad/audit-helpers";
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
      return respondError(res, "puesto_no_encontrado");
    }
    if (error.code === "P2003") {
      return respondError(res, "relacion_invalida", { field: error.meta?.field_name });
    }
  }

  return respondError(res, "error_interno", isSandbox ? { error } : undefined);
}

export class PuestoController {
  static async listar(req: Request, res: Response) {
    try {
      const areaId = typeof req.query.areaId === "string" ? Number(req.query.areaId) : undefined;
      const nombre = typeof req.query.nombre === "string" ? req.query.nombre : undefined;
      const { page, pageSize, skip, take } = parsePagination(req.query);

      const puestos = await prisma.puesto.findMany({
        where: {
          ...(Number.isFinite(areaId) ? { areaId } : {}),
          ...(nombre
            ? { nombre: { contains: nombre, mode: "insensitive" } }
            : {}),
        },
        orderBy: { id: "desc" },
        skip,
        take,
      });

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_READ,
        targetType: "Puesto",
        targetId: "list",
        metadata: { page, pageSize, areaId, nombre, count: puestos.length },
      });

      return res.status(200).json(puestos.map(toPuestoPublic));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async obtener(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const puesto = await prisma.puesto.findUnique({ where: { id } });
      if (!puesto) return respondError(res, "puesto_no_encontrado");

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_READ,
        targetType: "Puesto",
        targetId: String(id),
      });

      return res.status(200).json(toPuestoPublic(puesto));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async crear(req: Request, res: Response) {
    const parsed = puestoCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    try {
      const data = toPuestoCreateData(parsed.data);
      const puesto = await prisma.puesto.create({ data });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_CREATE,
        targetType: "Puesto",
        targetId: String(puesto.id),
      });
      return res.status(201).json(toPuestoPublic(puesto));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async actualizar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    const parsed = puestoUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    if (Object.keys(parsed.data).length === 0) {
      return respondError(res, "sin_cambios");
    }

    try {
      const data = toPuestoUpdateData(parsed.data);
      const puesto = await prisma.puesto.update({ where: { id }, data });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_UPDATE,
        targetType: "Puesto",
        targetId: String(id),
        metadata: { fields: Object.keys(parsed.data) },
      });
      return res.status(200).json(toPuestoPublic(puesto));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async eliminar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const related = await prisma.$transaction([
        prisma.empleado.count({ where: { puestoId: id } }),
        prisma.checklist.count({ where: { puestoId: id } }),
        prisma.credencialWeb.count({ where: { puestoId: id } }),
      ]);

      const [empleadosCount, checklistsCount, credencialesCount] = related;
      if (empleadosCount > 0 || checklistsCount > 0 || credencialesCount > 0) {
        return respondError(res, "relacion_invalida", {
          empleados: empleadosCount,
          checklists: checklistsCount,
          credenciales: credencialesCount,
        });
      }

      const puesto = await prisma.puesto.delete({ where: { id } });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_DELETE,
        targetType: "Puesto",
        targetId: String(id),
      });
      return res.status(200).json(toPuestoPublic(puesto));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }
}
