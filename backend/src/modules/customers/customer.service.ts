import { prisma } from "../../config/db";
import { writeAuditLog } from "../../lib/auditLog";
import { PaginationParams } from "../../lib/pagination";
import { HttpError } from "../../middleware/errorHandler";
import { CreateCustomerInput, UpdateCustomerInput } from "./customer.schema";

export async function listCustomers(pagination: PaginationParams, search?: string) {
  const where = search ? { name: { contains: search, mode: "insensitive" as const } } : {};

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      orderBy: { name: "asc" },
    }),
    prisma.customer.count({ where }),
  ]);

  return { data, total };
}

export async function getCustomer(id: string) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    throw new HttpError(404, "Customer not found");
  }
  return customer;
}

export async function createCustomer(input: CreateCustomerInput, actorId: string) {
  const customer = await prisma.customer.create({ data: input });
  await writeAuditLog({
    userId: actorId,
    action: "CUSTOMER_CREATED",
    entityType: "Customer",
    entityId: customer.id,
  });
  return customer;
}

export async function updateCustomer(id: string, input: UpdateCustomerInput, actorId: string) {
  await getCustomer(id);
  const customer = await prisma.customer.update({ where: { id }, data: input });
  await writeAuditLog({
    userId: actorId,
    action: "CUSTOMER_UPDATED",
    entityType: "Customer",
    entityId: customer.id,
    metadata: input,
  });
  return customer;
}

export async function deactivateCustomer(id: string, actorId: string) {
  await getCustomer(id);
  const customer = await prisma.customer.update({ where: { id }, data: { isActive: false } });
  await writeAuditLog({
    userId: actorId,
    action: "CUSTOMER_DEACTIVATED",
    entityType: "Customer",
    entityId: customer.id,
  });
  return customer;
}
