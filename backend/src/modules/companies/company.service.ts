import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { PaginationParams } from "../../lib/pagination";
import { HttpError } from "../../middleware/errorHandler";
import { getFile } from "../files/file.service";
import { CreateCompanyInput, UpdateCompanyInput } from "./company.schema";

export async function listCompanies(pagination: PaginationParams, search?: string) {
  const where = search ? { name: { contains: search, mode: "insensitive" as const } } : {};

  const [data, total] = await Promise.all([
    prisma.company.findMany({
      where,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      orderBy: { name: "asc" },
    }),
    prisma.company.count({ where }),
  ]);

  return { data, total };
}

export async function getCompany(id: string) {
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) {
    throw new HttpError(404, "Company not found");
  }
  return company;
}

async function assertReferencesExist(input: { countryId?: string; agreementFileId?: string }) {
  if (input.countryId) {
    const country = await prisma.country.findUnique({ where: { id: input.countryId } });
    if (!country) {
      throw new HttpError(400, "Country not found");
    }
  }
  if (input.agreementFileId) {
    await getFile(input.agreementFileId);
  }
}

export async function createCompany(input: CreateCompanyInput, context: AuditContext) {
  const existing = await prisma.company.findUnique({ where: { companyCode: input.companyCode } });
  if (existing) {
    throw new HttpError(409, "Company code already in use");
  }
  await assertReferencesExist(input);

  const company = await prisma.company.create({ data: input });
  await writeAuditLog({
    ...context,
    action: "COMPANY_CREATED",
    entityType: "Company",
    entityId: company.id,
    after: company,
  });
  return company;
}

export async function updateCompany(id: string, input: UpdateCompanyInput, context: AuditContext) {
  const before = await getCompany(id);

  if (input.companyCode) {
    const existing = await prisma.company.findUnique({ where: { companyCode: input.companyCode } });
    if (existing && existing.id !== id) {
      throw new HttpError(409, "Company code already in use");
    }
  }
  await assertReferencesExist(input);

  const company = await prisma.company.update({ where: { id }, data: input });
  await writeAuditLog({
    ...context,
    action: "COMPANY_UPDATED",
    entityType: "Company",
    entityId: company.id,
    before,
    after: company,
  });
  return company;
}

export async function deactivateCompany(id: string, context: AuditContext) {
  const before = await getCompany(id);
  const company = await prisma.company.update({ where: { id }, data: { isActive: false } });
  await writeAuditLog({
    ...context,
    action: "COMPANY_DEACTIVATED",
    entityType: "Company",
    entityId: company.id,
    before,
    after: company,
  });
  return company;
}
