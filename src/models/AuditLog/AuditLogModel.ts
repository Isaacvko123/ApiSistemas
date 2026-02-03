import { z } from "zod";
import { type AuditLog, AuditAction } from "@prisma/client";

export const auditLogFilterSchema = z
  .object({
    action: z.nativeEnum(AuditAction).optional(),
    actorId: z.number().int().positive().optional(),
    targetType: z.string().max(100).optional(),
    targetId: z.string().max(100).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  })
  .strict();

export type AuditLogPublic = AuditLog;

export function toAuditLogPublic(log: AuditLog): AuditLogPublic {
  return log;
}
