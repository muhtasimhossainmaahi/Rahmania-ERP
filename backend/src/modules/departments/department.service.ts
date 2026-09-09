import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { PaginationParams } from "../../lib/pagination";
import { HttpError } from "../../middleware/errorHandler";
import { CreateDepartmentInput, UpdateDepartmentInput } from "./department.schema";

export async function listDepartments(pagination: PaginationParams, search?: string) {
  const where = search ? { name: { contains: search, mode: "insensitive" as const } } : {};

  const [data, total] = await Promise.all([
    prisma.department.findMany({
      where,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      orderBy: { name: "asc" },
    }),
    prisma.department.count({ where }),
  ]);

  return { data, total };
}

export async function getDepartment(id: string) {
  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) {
    throw new HttpError(404, "Department not found");
  }
  return department;
}

export async function createDepartment(input: CreateDepartmentInput, context: AuditContext) {
  const department = await prisma.department.create({ data: input });
  await writeAuditLog({
    ...context,
    action: "DEPARTMENT_CREATED",
    entityType: "Department",
    entityId: department.id,
    after: department,
  });
  return department;
}

export async function updateDepartment(
  id: string,
  input: UpdateDepartmentInput,
  context: AuditContext,
) {
  const before = await getDepartment(id);
  const department = await prisma.department.update({ where: { id }, data: input });
  await writeAuditLog({
    ...context,
    action: "DEPARTMENT_UPDATED",
    entityType: "Department",
    entityId: department.id,
    before,
    after: department,
  });
  return department;
}

export async function deactivateDepartment(id: string, context: AuditContext) {
  const before = await getDepartment(id);
  const department = await prisma.department.update({ where: { id }, data: { isActive: false } });
  await writeAuditLog({
    ...context,
    action: "DEPARTMENT_DEACTIVATED",
    entityType: "Department",
    entityId: department.id,
    before,
    after: department,
  });
  return department;
}
