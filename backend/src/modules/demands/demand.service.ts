import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { generateDemandNo } from "../../lib/businessId";
import { PaginationParams } from "../../lib/pagination";
import { HttpError } from "../../middleware/errorHandler";
import {
  CreateDemandInput,
  CreatePositionInput,
  UpdateDemandInput,
  UpdatePositionInput,
} from "./demand.schema";

export async function listDemands(pagination: PaginationParams, search?: string) {
  const where = search
    ? {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { demandNo: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    prisma.demand.findMany({
      where,
      include: { positions: true },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      orderBy: { receivedDate: "desc" },
    }),
    prisma.demand.count({ where }),
  ]);

  return { data, total };
}

export async function getDemand(id: string) {
  const demand = await prisma.demand.findUnique({ where: { id }, include: { positions: true } });
  if (!demand) {
    throw new HttpError(404, "Demand not found");
  }
  return demand;
}

async function assertReferencesValid(input: { companyId?: string; countryId?: string }) {
  if (input.companyId) {
    const company = await prisma.company.findUnique({ where: { id: input.companyId } });
    if (!company) {
      throw new HttpError(400, "Company not found");
    }
  }
  if (input.countryId) {
    const country = await prisma.country.findUnique({ where: { id: input.countryId } });
    if (!country) {
      throw new HttpError(400, "Country not found");
    }
  }
}

export async function createDemand(input: CreateDemandInput, context: AuditContext) {
  await assertReferencesValid(input);

  const demandNo = await generateDemandNo();
  const { positions, ...demandFields } = input;

  const demand = await prisma.demand.create({
    data: {
      ...demandFields,
      demandNo,
      positions: positions ? { create: positions } : undefined,
    },
    include: { positions: true },
  });

  await writeAuditLog({
    ...context,
    action: "DEMAND_CREATED",
    entityType: "Demand",
    entityId: demand.id,
    after: demand,
  });
  return demand;
}

export async function updateDemand(id: string, input: UpdateDemandInput, context: AuditContext) {
  const before = await getDemand(id);
  await assertReferencesValid(input);

  const demand = await prisma.demand.update({
    where: { id },
    data: input,
    include: { positions: true },
  });

  await writeAuditLog({
    ...context,
    action: "DEMAND_UPDATED",
    entityType: "Demand",
    entityId: demand.id,
    before,
    after: demand,
  });
  return demand;
}

export async function addPosition(demandId: string, input: CreatePositionInput, context: AuditContext) {
  await getDemand(demandId);

  const position = await prisma.demandPosition.create({
    data: { ...input, demandId },
  });

  await writeAuditLog({
    ...context,
    action: "DEMAND_POSITION_CREATED",
    entityType: "DemandPosition",
    entityId: position.id,
    after: position,
  });
  return position;
}

async function getPosition(demandId: string, positionId: string) {
  const position = await prisma.demandPosition.findUnique({ where: { id: positionId } });
  if (!position || position.demandId !== demandId) {
    throw new HttpError(404, "Position not found");
  }
  return position;
}

export async function updatePosition(
  demandId: string,
  positionId: string,
  input: UpdatePositionInput,
  context: AuditContext,
) {
  const before = await getPosition(demandId, positionId);

  const position = await prisma.demandPosition.update({ where: { id: positionId }, data: input });

  await writeAuditLog({
    ...context,
    action: "DEMAND_POSITION_UPDATED",
    entityType: "DemandPosition",
    entityId: position.id,
    before,
    after: position,
  });
  return position;
}

export async function deactivatePosition(demandId: string, positionId: string, context: AuditContext) {
  const before = await getPosition(demandId, positionId);

  const position = await prisma.demandPosition.update({
    where: { id: positionId },
    data: { isActive: false },
  });

  await writeAuditLog({
    ...context,
    action: "DEMAND_POSITION_DEACTIVATED",
    entityType: "DemandPosition",
    entityId: position.id,
    before,
    after: position,
  });
  return position;
}
