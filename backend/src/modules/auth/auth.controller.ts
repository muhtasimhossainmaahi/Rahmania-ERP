import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/db";
import { auditContext } from "../../lib/auditContext";
import { HttpError } from "../../middleware/errorHandler";
import { loginSchema, registerSchema } from "./auth.schema";
import { loginUser, registerUser } from "./auth.service";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerSchema.parse(req.body);
    const user = await registerUser(input, auditContext(req));
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body);
    const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;
    const result = await loginUser(input, { ip: req.ip, userAgent });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      throw new HttpError(404, "User not found");
    }
    const { passwordHash: _passwordHash, ...rest } = user;
    res.json(rest);
  } catch (err) {
    next(err);
  }
}
