import { Role } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { HttpError } from "./errorHandler";

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError(403, "Insufficient permissions"));
    }
    next();
  };
}
