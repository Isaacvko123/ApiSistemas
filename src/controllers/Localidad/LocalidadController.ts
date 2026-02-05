import type { Request, Response } from "express";
import { Prisma, AuditAction } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import {
  localidadCreateSchema,
  localidadUpdateSchema,
  toLocalidadPublic,
} from "../../models/Localidad/LocalidadModel";
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
      return respondError(res, "localidad_no_encontrada");
    }
    if (error.code === "P2003") {
      return respondError(res, "relacion_invalida", { field: error.meta?.field_name });
    }
  }

  return respondError(res, "error_interno", isSandbox ? { error } : undefined);
}

export class LocalidadController {
  static async listar(req: Request, res: Response) {
    try {
      const estado = typeof req.query.estado === "string" ? req.query.estado : undefined;
      const codigo = typeof req.query.codigo === "string" ? req.query.codigo : undefined;
      const { page, pageSize, skip, take } = parsePagination(req.query);

      const localidades = await prisma.localidad.findMany({
        where: {
          ...(estado ? { estado } : {}),
          ...(codigo ? { codigo } : {}),
        },
        orderBy: { id: "desc" },
        skip,
        take,
      });

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_READ,
        targetType: "Localidad",
        targetId: "list",
        metadata: { page, pageSize, estado, codigo, count: localidades.length },
      });

      return res.status(200).json(localidades.map(toLocalidadPublic));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async obtener(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const localidad = await prisma.localidad.findUnique({ where: { id } });
      if (!localidad) return respondError(res, "localidad_no_encontrada");

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_READ,
        targetType: "Localidad",
        targetId: String(id),
      });

      return res.status(200).json(toLocalidadPublic(localidad));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async crear(req: Request, res: Response) {
    const parsed = localidadCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    try {
      const localidad = await prisma.localidad.create({ data: parsed.data });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_CREATE,
        targetType: "Localidad",
        targetId: String(localidad.id),
      });
      return res.status(201).json(toLocalidadPublic(localidad));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async actualizar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    const parsed = localidadUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    if (Object.keys(parsed.data).length === 0) {
      return respondError(res, "sin_cambios");
    }

    try {
      const localidad = await prisma.localidad.update({ where: { id }, data: parsed.data });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_UPDATE,
        targetType: "Localidad",
        targetId: String(id),
        metadata: { fields: Object.keys(parsed.data) },
      });
      return res.status(200).json(toLocalidadPublic(localidad));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async eliminar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const related = await prisma.$transaction([
        prisma.empleado.count({ where: { localidadId: id } }),
        prisma.equipo.count({ where: { localidadId: id } }),
        prisma.resguardo.count({ where: { localidadId: id } }),
        prisma.wifiCredencial.count({ where: { localidadId: id } }),
      ]);

      const [empleadosCount, equiposCount, resguardosCount, wifiCount] = related;
      if (empleadosCount > 0 || equiposCount > 0 || resguardosCount > 0 || wifiCount > 0) {
        return respondError(res, "relacion_invalida", {
          empleados: empleadosCount,
          equipos: equiposCount,
          resguardos: resguardosCount,
          wifiCredenciales: wifiCount,
        });
      }

      const localidad = await prisma.localidad.delete({ where: { id } });
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_DELETE,
        targetType: "Localidad",
        targetId: String(id),
      });
      return res.status(200).json(toLocalidadPublic(localidad));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }
}
