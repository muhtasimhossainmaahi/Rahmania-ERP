import { prisma } from "../../config/db";
import { writeAuditLog } from "../../lib/auditLog";
import { PaginationParams } from "../../lib/pagination";
import { HttpError } from "../../middleware/errorHandler";
import { CreateSupplierInput, UpdateSupplierInput } from "./supplier.schema";

export async function listSuppliers(pagination: PaginationParams, search?: string) {
  const where = search ? { name: { contains: search, mode: "insensitive" as const } } : {};

  const [data, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      orderBy: { name: "asc" },
    }),
    prisma.supplier.count({ where }),
  ]);

  return { data, total };
}

export async function getSupplier(id: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) {
    throw new HttpError(404, "Supplier not found");
  }
  return supplier;
}

export async function createSupplier(input: CreateSupplierInput, actorId: string) {
  const supplier = await prisma.supplier.create({ data: input });
  await writeAuditLog({
    userId: actorId,
    action: "SUPPLIER_CREATED",
    entityType: "Supplier",
    entityId: supplier.id,
  });
  return supplier;
}

export async function updateSupplier(id: string, input: UpdateSupplierInput, actorId: string) {
  await getSupplier(id);
  const supplier = await prisma.supplier.update({ where: { id }, data: input });
  await writeAuditLog({
    userId: actorId,
    action: "SUPPLIER_UPDATED",
    entityType: "Supplier",
    entityId: supplier.id,
    metadata: input,
  });
  return supplier;
}

export async function deactivateSupplier(id: string, actorId: string) {
  await getSupplier(id);
  const supplier = await prisma.supplier.update({ where: { id }, data: { isActive: false } });
  await writeAuditLog({
    userId: actorId,
    action: "SUPPLIER_DEACTIVATED",
    entityType: "Supplier",
    entityId: supplier.id,
  });
  return supplier;
}
