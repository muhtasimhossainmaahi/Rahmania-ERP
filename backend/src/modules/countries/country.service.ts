import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { PaginationParams } from "../../lib/pagination";
import { HttpError } from "../../middleware/errorHandler";
import { CreateCountryInput, UpdateCountryInput } from "./country.schema";

export async function listCountries(pagination: PaginationParams, search?: string) {
  const where = search ? { name: { contains: search, mode: "insensitive" as const } } : {};

  const [data, total] = await Promise.all([
    prisma.country.findMany({
      where,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      orderBy: { name: "asc" },
    }),
    prisma.country.count({ where }),
  ]);

  return { data, total };
}

export async function getCountry(id: string) {
  const country = await prisma.country.findUnique({ where: { id } });
  if (!country) {
    throw new HttpError(404, "Country not found");
  }
  return country;
}

export async function createCountry(input: CreateCountryInput, context: AuditContext) {
  const existing = await prisma.country.findUnique({ where: { code: input.code } });
  if (existing) {
    throw new HttpError(409, "Country code already in use");
  }

  const country = await prisma.country.create({ data: input });
  await writeAuditLog({
    ...context,
    action: "COUNTRY_CREATED",
    entityType: "Country",
    entityId: country.id,
    after: country,
  });
  return country;
}

export async function updateCountry(id: string, input: UpdateCountryInput, context: AuditContext) {
  const before = await getCountry(id);

  if (input.code) {
    const existing = await prisma.country.findUnique({ where: { code: input.code } });
    if (existing && existing.id !== id) {
      throw new HttpError(409, "Country code already in use");
    }
  }

  const country = await prisma.country.update({ where: { id }, data: input });
  await writeAuditLog({
    ...context,
    action: "COUNTRY_UPDATED",
    entityType: "Country",
    entityId: country.id,
    before,
    after: country,
  });
  return country;
}

export async function deactivateCountry(id: string, context: AuditContext) {
  const before = await getCountry(id);
  const country = await prisma.country.update({ where: { id }, data: { isActive: false } });
  await writeAuditLog({
    ...context,
    action: "COUNTRY_DEACTIVATED",
    entityType: "Country",
    entityId: country.id,
    before,
    after: country,
  });
  return country;
}
