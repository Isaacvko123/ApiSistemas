import type { Request, Response } from "express";
import { Prisma, AuditAction } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import {
  areaCreateSchema,
  areaUpdateSchema,
  toAreaPublic,
} from "../../models/Area/AreaModel";
import { auditEntity } from "../../seguridad/audit-helpers";
import { parsePagination } from "../../utils/pagination";
import { respondList } from "../../utils/respond";
import { getCache, invalidatePrefix, setCache } from "../../utils/cache";
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
  static async listar(req: Request, res: Response) {
    try {
      const nombre = typeof req.query.nombre === "string" ? req.query.nombre : undefined;
      const { page, pageSize, skip, take } = parsePagination(req.query);
      const cacheKey = `areas:list:${page}:${pageSize}:${nombre ?? ""}`;
      const cached = getCache<ReturnType<typeof toAreaPublic>[]>(cacheKey);
      if (cached) {
        await auditEntity({
          req,
          res,
          action: AuditAction.ENTITY_READ,
          targetType: "Area",
          targetId: "list",
          metadata: { page, pageSize, nombre, count: cached.length, cached: true },
        });
        return respondList(req, res, cached, {
          page,
          pageSize,
          nombre,
          count: cached.length,
        });
      }
      const areas = await prisma.area.findMany({
        where: {
          ...(nombre
            ? { nombre: { contains: nombre, mode: "insensitive" } }
            : {}),
        },
        orderBy: { id: "desc" },
        skip,
        take,
      });
      const payload = areas.map(toAreaPublic);
      setCache(cacheKey, payload, 30_000);

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_READ,
        targetType: "Area",
        targetId: "list",
        metadata: { page, pageSize, nombre, count: areas.length, cached: false },
      });

      return respondList(req, res, payload, {
        page,
        pageSize,
        nombre,
        count: areas.length,
      });
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

      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_READ,
        targetType: "Area",
        targetId: String(id),
      });

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
      invalidatePrefix("areas:list:");
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_CREATE,
        targetType: "Area",
        targetId: String(area.id),
      });
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
      invalidatePrefix("areas:list:");
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_UPDATE,
        targetType: "Area",
        targetId: String(id),
        metadata: { fields: Object.keys(parsed.data) },
      });
      return res.status(200).json(toAreaPublic(area));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async eliminar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const related = await prisma.$transaction([
        prisma.puesto.count({ where: { areaId: id } }),
        prisma.empleado.count({ where: { areaId: id } }),
        prisma.credencialWeb.count({ where: { areaId: id } }),
      ]);

      const [puestosCount, empleadosCount, credencialesCount] = related;
      if (puestosCount > 0 || empleadosCount > 0 || credencialesCount > 0) {
        return respondError(res, "relacion_invalida", {
          puestos: puestosCount,
          empleados: empleadosCount,
          credenciales: credencialesCount,
        });
      }

      const area = await prisma.area.delete({ where: { id } });
      invalidatePrefix("areas:list:");
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_DELETE,
        targetType: "Area",
        targetId: String(id),
      });
      return res.status(200).json(toAreaPublic(area));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }
}
