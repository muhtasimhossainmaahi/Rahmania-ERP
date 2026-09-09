import { Request } from "express";
import { AuditContext } from "./auditLog";

export function auditContext(req: Request): AuditContext {
  return {
    userId: req.user!.id,
    ip: req.ip,
    userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
  };
}
