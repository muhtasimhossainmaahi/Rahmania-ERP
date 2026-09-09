import { Role } from "@prisma/client";
import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { PaginationParams } from "../../lib/pagination";
import { HttpError } from "../../middleware/errorHandler";
import { getFile } from "../files/file.service";
import { CreateAgentInput, UpdateAgentInput } from "./agent.schema";

export async function listAgents(pagination: PaginationParams, search?: string) {
  const where = search ? { name: { contains: search, mode: "insensitive" as const } } : {};

  const [data, total] = await Promise.all([
    prisma.agent.findMany({
      where,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      orderBy: { name: "asc" },
    }),
    prisma.agent.count({ where }),
  ]);

  return { data, total };
}

export async function getAgent(id: string) {
  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) {
    throw new HttpError(404, "Agent not found");
  }
  return agent;
}

async function assertReferencesValid(
  input: { agreementFileId?: string; userId?: string },
  excludeAgentId?: string,
) {
  if (input.agreementFileId) {
    await getFile(input.agreementFileId);
  }
  if (input.userId) {
    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) {
      throw new HttpError(400, "User not found");
    }
    if (user.role !== Role.AGENT) {
      throw new HttpError(400, "Linked user must have the AGENT role");
    }

    const linkedAgent = await prisma.agent.findUnique({ where: { userId: input.userId } });
    if (linkedAgent && linkedAgent.id !== excludeAgentId) {
      throw new HttpError(409, "This user is already linked to another agent");
    }
  }
}

export async function createAgent(input: CreateAgentInput, context: AuditContext) {
  const existing = await prisma.agent.findUnique({ where: { agentCode: input.agentCode } });
  if (existing) {
    throw new HttpError(409, "Agent code already in use");
  }
  await assertReferencesValid(input);

  const agent = await prisma.agent.create({ data: input });
  await writeAuditLog({
    ...context,
    action: "AGENT_CREATED",
    entityType: "Agent",
    entityId: agent.id,
    after: agent,
  });
  return agent;
}

export async function updateAgent(id: string, input: UpdateAgentInput, context: AuditContext) {
  const before = await getAgent(id);

  if (input.agentCode) {
    const existing = await prisma.agent.findUnique({ where: { agentCode: input.agentCode } });
    if (existing && existing.id !== id) {
      throw new HttpError(409, "Agent code already in use");
    }
  }
  await assertReferencesValid(input, id);

  const agent = await prisma.agent.update({ where: { id }, data: input });
  await writeAuditLog({
    ...context,
    action: "AGENT_UPDATED",
    entityType: "Agent",
    entityId: agent.id,
    before,
    after: agent,
  });
  return agent;
}

export async function deactivateAgent(id: string, context: AuditContext) {
  const before = await getAgent(id);
  const agent = await prisma.agent.update({ where: { id }, data: { isActive: false } });
  await writeAuditLog({
    ...context,
    action: "AGENT_DEACTIVATED",
    entityType: "Agent",
    entityId: agent.id,
    before,
    after: agent,
  });
  return agent;
}
