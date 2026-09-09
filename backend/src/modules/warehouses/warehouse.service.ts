import { prisma } from "../../config/db";
import { writeAuditLog } from "../../lib/auditLog";
import { PaginationParams } from "../../lib/pagination";
import { HttpError } from "../../middleware/errorHandler";
import { CreateWarehouseInput, UpdateWarehouseInput } from "./warehouse.schema";

export async function listWarehouses(pagination: PaginationParams, search?: string) {
  const where = search ? { name: { contains: search, mode: "insensitive" as const } } : {};

  const [data, total] = await Promise.all([
    prisma.warehouse.findMany({
      where,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      orderBy: { name: "asc" },
    }),
    prisma.warehouse.count({ where }),
  ]);

  return { data, total };
}

export async function getWarehouse(id: string) {
  const warehouse = await prisma.warehouse.findUnique({ where: { id } });
  if (!warehouse) {
    throw new HttpError(404, "Warehouse not found");
  }
  return warehouse;
}

export async function createWarehouse(input: CreateWarehouseInput, actorId: string) {
  const warehouse = await prisma.warehouse.create({ data: input });
  await writeAuditLog({
    userId: actorId,
    action: "WAREHOUSE_CREATED",
    entityType: "Warehouse",
    entityId: warehouse.id,
  });
  return warehouse;
}

export async function updateWarehouse(id: string, input: UpdateWarehouseInput, actorId: string) {
  await getWarehouse(id);
  const warehouse = await prisma.warehouse.update({ where: { id }, data: input });
  await writeAuditLog({
    userId: actorId,
    action: "WAREHOUSE_UPDATED",
    entityType: "Warehouse",
    entityId: warehouse.id,
    metadata: input,
  });
  return warehouse;
}

export async function deactivateWarehouse(id: string, actorId: string) {
  await getWarehouse(id);
  const warehouse = await prisma.warehouse.update({ where: { id }, data: { isActive: false } });
  await writeAuditLog({
    userId: actorId,
    action: "WAREHOUSE_DEACTIVATED",
    entityType: "Warehouse",
    entityId: warehouse.id,
  });
  return warehouse;
}
