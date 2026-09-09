import { User } from "@prisma/client";
import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { signToken } from "../../lib/jwt";
import { comparePassword, hashPassword } from "../../lib/password";
import { HttpError } from "../../middleware/errorHandler";
import { LoginInput, RegisterInput } from "./auth.schema";

export async function registerUser(input: RegisterInput, context: AuditContext) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new HttpError(409, "Email already in use");
  }

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash: await hashPassword(input.password),
      employeeCode: input.employeeCode,
      mobile: input.mobile,
      departmentId: input.departmentId,
      designation: input.designation,
      managerId: input.managerId,
    },
  });

  await writeAuditLog({
    ...context,
    action: "USER_CREATED",
    entityType: "User",
    entityId: user.id,
    after: sanitizeUser(user),
  });

  return sanitizeUser(user);
}

export async function loginUser(input: LoginInput, meta: { ip?: string; userAgent?: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !user.isActive || !(await comparePassword(input.password, user.passwordHash))) {
    throw new HttpError(401, "Invalid email or password");
  }

  const token = signToken({ sub: user.id, role: user.role });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  await writeAuditLog({
    userId: user.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    action: "USER_LOGIN",
    entityType: "User",
    entityId: user.id,
  });

  return { token, user: sanitizeUser(user) };
}

function sanitizeUser(user: User) {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}
