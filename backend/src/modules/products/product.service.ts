import { prisma } from "../../config/db";
import { writeAuditLog } from "../../lib/auditLog";
import { PaginationParams } from "../../lib/pagination";
import { HttpError } from "../../middleware/errorHandler";
import { CreateProductInput, UpdateProductInput } from "./product.schema";

export async function listProducts(pagination: PaginationParams, search?: string) {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { sku: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      orderBy: { name: "asc" },
    }),
    prisma.product.count({ where }),
  ]);

  return { data, total };
}

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new HttpError(404, "Product not found");
  }
  return product;
}

export async function createProduct(input: CreateProductInput, actorId: string) {
  const existing = await prisma.product.findUnique({ where: { sku: input.sku } });
  if (existing) {
    throw new HttpError(409, "SKU already in use");
  }

  const product = await prisma.product.create({ data: input });
  await writeAuditLog({
    userId: actorId,
    action: "PRODUCT_CREATED",
    entityType: "Product",
    entityId: product.id,
  });
  return product;
}

export async function updateProduct(id: string, input: UpdateProductInput, actorId: string) {
  await getProduct(id);

  if (input.sku) {
    const existing = await prisma.product.findUnique({ where: { sku: input.sku } });
    if (existing && existing.id !== id) {
      throw new HttpError(409, "SKU already in use");
    }
  }

  const product = await prisma.product.update({ where: { id }, data: input });
  await writeAuditLog({
    userId: actorId,
    action: "PRODUCT_UPDATED",
    entityType: "Product",
    entityId: product.id,
    metadata: input,
  });
  return product;
}

export async function deactivateProduct(id: string, actorId: string) {
  await getProduct(id);
  const product = await prisma.product.update({ where: { id }, data: { isActive: false } });
  await writeAuditLog({
    userId: actorId,
    action: "PRODUCT_DEACTIVATED",
    entityType: "Product",
    entityId: product.id,
  });
  return product;
}
