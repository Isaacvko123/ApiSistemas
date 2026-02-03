import { Prisma, AuditAction } from "@prisma/client";
import { prisma } from "../db/prisma";
import { env } from "../config/env";

export type AuditInput = {
  action: AuditAction;
  actorId?: number | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  ip?: string | null;
  userAgent?: string | null;
};

export async function writeAuditLog(input: AuditInput): Promise<void> {
  try {
    const metadata =
      input.metadata === undefined
        ? undefined
        : input.metadata === null
          ? Prisma.DbNull
          : input.metadata;

    await prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId ?? null,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        metadata,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    if (env.nodeEnv !== "test") {
      console.warn("[AUDIT] No se pudo registrar auditoría:", error);
    }
  }
}
