import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";

export interface AuditContext {
  userId: string;
  ip?: string;
  userAgent?: string;
}

interface AuditLogInput extends AuditContext {
  action: string;
  entityType: string;
  entityId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

export function writeAuditLog(input: AuditLogInput) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeJson: (input.before ?? undefined) as Prisma.InputJsonValue | undefined,
      afterJson: (input.after ?? undefined) as Prisma.InputJsonValue | undefined,
      ipAddress: input.ip,
      userAgent: input.userAgent,
    },
  });
}
