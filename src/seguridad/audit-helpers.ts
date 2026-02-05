import type { Request, Response } from "express";
import { AuditAction, Prisma } from "@prisma/client";
import { writeAuditLog } from "./audit";
import { SesionesService } from "./sesiones.service";

export async function auditEntity(params: {
  req: Request;
  res: Response;
  action: AuditAction;
  targetType: string;
  targetId: string;
  metadata?: Prisma.InputJsonValue | null;
}) {
  const meta = SesionesService.extraerMeta(params.req);
  const actorId = params.res.locals.user?.sub ? Number(params.res.locals.user.sub) : null;

  void writeAuditLog({
    action: params.action,
    actorId: Number.isFinite(actorId as number) ? (actorId as number) : null,
    targetType: params.targetType,
    targetId: params.targetId,
    metadata: params.metadata,
    ip: meta.ip ?? null,
    userAgent: meta.userAgent ?? null,
  });
}
