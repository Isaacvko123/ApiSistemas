import type { Request, Response } from "express";
import { Prisma, AuditAction } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import {
  tipoEquipoCreateSchema,
  tipoEquipoUpdateSchema,
  toTipoEquipoPublic,
} from "../../models/TipoEquipo/TipoEquipoModel";
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
      return respondError(res, "tipo_no_encontrado");
    }
    if (error.code === "P2003") {
      return respondError(res, "relacion_invalida", { field: error.meta?.field_name });
    }
  }

  return respondError(res, "error_interno", isSandbox ? { error } : undefined);
}

export class TipoEquipoController {
  static async listar(req: Request, res: Response) {
    try {
      const nombre = typeof req.query.nombre === "string" ? req.query.nombre : undefined;
      const activo =
        typeof req.query.activo === "string" ? req.query.activo === "true" : undefined;
      const { page, pageSize, skip, take } = parsePagination(req.query);
      const cacheKey = `tipos-equipo:list:${page}:${pageSize}:${nombre ?? ""}:${activo ?? ""}`;
      const cached = getCache<ReturnType<typeof toTipoEquipoPublic>[]>(cacheKey);
      if (cached) {
        await auditEntity({
          req,
          res,
          action: AuditAction.ENTITY_READ,
          targetType: "TipoEquipo",
          targetId: "list",
          metadata: { page, pageSize, nombre, activo, count: cached.length, cached: true },
        });
        return respondList(req, res, cached, {
          page,
          pageSize,
          nombre,
          activo,
          count: cached.length,
        });
      }
      const tipos = await prisma.tipoEquipo.findMany({
        where: {
          ...(nombre
            ? { nombre: { contains: nombre, mode: "insensitive" } }
            : {}),
          ...(typeof activo === "boolean" ? { activo } : {}),
        },
        orderBy: { id: "desc" },
        skip,
        take,
      });
      const payload = tipos.map(toTipoEquipoPublic);
      setCache(cacheKey, payload, 30_000);
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_READ,
        targetType: "TipoEquipo",
        targetId: "list",
        metadata: { page, pageSize, nombre, activo, count: tipos.length, cached: false },
      });
      return respondList(req, res, payload, {
        page,
        pageSize,
        nombre,
        activo,
        count: tipos.length,
      });
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async obtener(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const tipo = await prisma.tipoEquipo.findUnique({ where: { id } });
      if (!tipo) return respondError(res, "tipo_no_encontrado");
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_READ,
        targetType: "TipoEquipo",
        targetId: String(id),
      });
      return res.status(200).json(toTipoEquipoPublic(tipo));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async crear(req: Request, res: Response) {
    const parsed = tipoEquipoCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }

    try {
      const tipo = await prisma.tipoEquipo.create({ data: parsed.data });
      invalidatePrefix("tipos-equipo:list:");
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_CREATE,
        targetType: "TipoEquipo",
        targetId: String(tipo.id),
      });
      return res.status(201).json(toTipoEquipoPublic(tipo));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async actualizar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    const parsed = tipoEquipoUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondError(res, "payload_invalido", parsed.error.flatten());
    }
    if (Object.keys(parsed.data).length === 0) {
      return respondError(res, "sin_cambios");
    }

    try {
      const tipo = await prisma.tipoEquipo.update({ where: { id }, data: parsed.data });
      invalidatePrefix("tipos-equipo:list:");
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_UPDATE,
        targetType: "TipoEquipo",
        targetId: String(id),
        metadata: { fields: Object.keys(parsed.data) },
      });
      return res.status(200).json(toTipoEquipoPublic(tipo));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }

  static async eliminar(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return respondError(res, "id_invalido");

    try {
      const related = await prisma.$transaction([
        prisma.equipo.count({ where: { tipoEquipoId: id } }),
        prisma.checklistItem.count({ where: { tipoEquipoId: id } }),
      ]);
      const [equiposCount, checklistCount] = related;
      if (equiposCount > 0 || checklistCount > 0) {
        return respondError(res, "relacion_invalida", {
          equipos: equiposCount,
          checklistItems: checklistCount,
        });
      }

      const tipo = await prisma.tipoEquipo.delete({ where: { id } });
      invalidatePrefix("tipos-equipo:list:");
      await auditEntity({
        req,
        res,
        action: AuditAction.ENTITY_DELETE,
        targetType: "TipoEquipo",
        targetId: String(id),
      });
      return res.status(200).json(toTipoEquipoPublic(tipo));
    } catch (error) {
      return handlePrismaError(res, error);
    }
  }
}
