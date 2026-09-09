import { CandidateStatus, Role } from "@prisma/client";
import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { generateCandidateCode } from "../../lib/businessId";
import { PaginationParams } from "../../lib/pagination";
import { normalizePassport } from "../../lib/passport";
import { getDuplicatePassportMode } from "../../lib/settings";
import { HttpError } from "../../middleware/errorHandler";
import { CreateCandidateInput, UpdateCandidateInput } from "./candidate.schema";
import { isStandardTransition } from "./candidateStatus";

export interface Actor {
  id: string;
  role: Role;
}

async function getOwnAgentId(userId: string): Promise<string | null> {
  const agent = await prisma.agent.findUnique({ where: { userId } });
  return agent?.id ?? null;
}

async function scopeForActor(actor: Actor) {
  if (actor.role !== Role.AGENT) {
    return {};
  }
  const agentId = await getOwnAgentId(actor.id);
  if (!agentId) {
    throw new HttpError(403, "No agent profile linked to this account");
  }
  return { agentId };
}

interface ListFilters {
  search?: string;
  agentId?: string;
  demandId?: string;
  status?: CandidateStatus;
}

export async function listCandidates(
  pagination: PaginationParams,
  actor: Actor,
  filters: ListFilters,
) {
  const scope = await scopeForActor(actor);

  const where: Record<string, unknown> = { ...scope };
  if (filters.agentId && actor.role !== Role.AGENT) {
    where.agentId = filters.agentId;
  }
  if (filters.demandId) {
    where.demandId = filters.demandId;
  }
  if (filters.status) {
    where.currentStatus = filters.status;
  }
  if (filters.search) {
    const search = filters.search;
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" as const } },
      { candidateCode: { contains: search, mode: "insensitive" as const } },
      { passportNo: { contains: normalizePassport(search), mode: "insensitive" as const } },
      { mobile: { contains: search, mode: "insensitive" as const } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.candidate.count({ where }),
  ]);

  return { data, total };
}

// Shared by every module that hangs off Candidate (documents, interviews,
// visa, medical, ...): confirms the candidate exists and, for an Agent
// actor, that it's their own (SRS 15). Modules needing scoped read access
// to a candidate's children should gate through this rather than
// re-deriving the agent-ownership check themselves.
export async function assertCandidateAccess(candidateId: string, actor: Actor) {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) {
    throw new HttpError(404, "Candidate not found");
  }
  if (actor.role === Role.AGENT) {
    const agentId = await getOwnAgentId(actor.id);
    if (!agentId || candidate.agentId !== agentId) {
      throw new HttpError(403, "Not permitted to access this candidate");
    }
  }
  return candidate;
}

export async function getCandidate(id: string, actor: Actor) {
  await assertCandidateAccess(id, actor);
  return prisma.candidate.findUnique({
    where: { id },
    include: { statusHistory: { orderBy: { changedAt: "desc" } } },
  });
}

async function assertReferencesValid(input: {
  agentId?: string;
  demandId?: string;
  positionId?: string;
  assignedEmployeeId?: string;
}) {
  if (input.agentId) {
    const agent = await prisma.agent.findUnique({ where: { id: input.agentId } });
    if (!agent) {
      throw new HttpError(400, "Agent not found");
    }
  }
  if (input.demandId) {
    const demand = await prisma.demand.findUnique({ where: { id: input.demandId } });
    if (!demand) {
      throw new HttpError(400, "Demand not found");
    }
  }
  if (input.positionId) {
    const position = await prisma.demandPosition.findUnique({ where: { id: input.positionId } });
    if (!position) {
      throw new HttpError(400, "Demand position not found");
    }
    if (input.demandId && position.demandId !== input.demandId) {
      throw new HttpError(400, "Position does not belong to the given demand");
    }
  }
  if (input.assignedEmployeeId) {
    const user = await prisma.user.findUnique({ where: { id: input.assignedEmployeeId } });
    if (!user) {
      throw new HttpError(400, "Assigned employee not found");
    }
  }
}

// SRS 21: duplicate passport detection is a warn-or-block admin toggle
// (candidate.duplicate_passport_mode in the Setting table, managed via
// PUT /settings/duplicate-passport-mode). BLOCK never allows a duplicate
// through. WARN surfaces the same 409 on the first attempt, but a second
// request with confirmDuplicate: true proceeds — a genuine re-registration
// case shouldn't be permanently stuck, just require an explicit
// acknowledgement. Returns whether this create/update is a confirmed
// duplicate override, so callers can note it in the audit log.
async function checkPassportDuplicate(
  passportNo: string,
  confirmDuplicate: boolean | undefined,
  excludeId?: string,
): Promise<{ overrodeDuplicate: boolean }> {
  const existing = await prisma.candidate.findFirst({ where: { passportNo } });
  if (!existing || existing.id === excludeId) {
    return { overrodeDuplicate: false };
  }

  const mode = await getDuplicatePassportMode();
  if (mode === "BLOCK" || !confirmDuplicate) {
    throw new HttpError(
      409,
      mode === "BLOCK"
        ? `Passport number already registered to candidate ${existing.candidateCode}`
        : `Passport number already registered to candidate ${existing.candidateCode}. Resubmit with confirmDuplicate: true to proceed anyway.`,
    );
  }

  return { overrodeDuplicate: true };
}

export async function createCandidate(input: CreateCandidateInput, context: AuditContext) {
  const { confirmDuplicate, ...fields } = input;
  const passportNo = normalizePassport(fields.passportNo);
  const { overrodeDuplicate } = await checkPassportDuplicate(passportNo, confirmDuplicate);
  await assertReferencesValid(fields);

  const candidateCode = await generateCandidateCode();
  const initialStatus = fields.currentStatus ?? CandidateStatus.REGISTERED;

  const candidate = await prisma.candidate.create({
    data: {
      ...fields,
      passportNo,
      candidateCode,
      currentStatus: initialStatus,
    },
  });

  await prisma.candidateStatusHistory.create({
    data: {
      candidateId: candidate.id,
      oldStatus: null,
      newStatus: candidate.currentStatus,
      changedBy: context.userId,
      remarks: "Candidate registered",
    },
  });

  await writeAuditLog({
    ...context,
    action: overrodeDuplicate ? "CANDIDATE_CREATED_DUPLICATE_CONFIRMED" : "CANDIDATE_CREATED",
    entityType: "Candidate",
    entityId: candidate.id,
    after: candidate,
  });

  return candidate;
}

export async function updateCandidate(
  id: string,
  input: UpdateCandidateInput,
  context: AuditContext,
) {
  const before = await prisma.candidate.findUnique({ where: { id } });
  if (!before) {
    throw new HttpError(404, "Candidate not found");
  }

  const { confirmDuplicate, ...fields } = input;
  const data = { ...fields };
  let overrodeDuplicate = false;
  if (fields.passportNo) {
    data.passportNo = normalizePassport(fields.passportNo);
    ({ overrodeDuplicate } = await checkPassportDuplicate(data.passportNo, confirmDuplicate, id));
  }
  await assertReferencesValid({
    agentId: fields.agentId,
    demandId: fields.demandId,
    positionId: fields.positionId,
    assignedEmployeeId: fields.assignedEmployeeId,
  });

  const candidate = await prisma.candidate.update({ where: { id }, data });

  await writeAuditLog({
    ...context,
    action: overrodeDuplicate ? "CANDIDATE_UPDATED_DUPLICATE_CONFIRMED" : "CANDIDATE_UPDATED",
    entityType: "Candidate",
    entityId: candidate.id,
    before,
    after: candidate,
  });

  return candidate;
}

export async function changeCandidateStatus(
  id: string,
  targetStatus: CandidateStatus,
  remarks: string | undefined,
  actor: Actor,
  context: AuditContext,
) {
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) {
    throw new HttpError(404, "Candidate not found");
  }

  const standard = isStandardTransition(candidate.currentStatus, targetStatus);

  if (!standard) {
    const overrideAuthorized = actor.role === Role.SUPER_ADMIN || actor.role === Role.MANAGEMENT;
    if (!overrideAuthorized) {
      throw new HttpError(
        403,
        `Transition from ${candidate.currentStatus} to ${targetStatus} is not permitted for your role`,
      );
    }
    if (!remarks) {
      throw new HttpError(400, "A reason is required to override the standard workflow transition");
    }
  }

  // SRS 15: "Candidate cannot be marked Selected unless linked to a valid
  // Demand Position."
  if (targetStatus === CandidateStatus.SELECTED && !candidate.positionId) {
    throw new HttpError(
      400,
      "Candidate must be linked to a valid Demand Position before being marked Selected",
    );
  }

  const updated = await prisma.candidate.update({
    where: { id },
    data: { currentStatus: targetStatus },
  });

  await prisma.candidateStatusHistory.create({
    data: {
      candidateId: id,
      oldStatus: candidate.currentStatus,
      newStatus: targetStatus,
      changedBy: context.userId,
      remarks,
    },
  });

  await writeAuditLog({
    ...context,
    action: "CANDIDATE_STATUS_CHANGED",
    entityType: "Candidate",
    entityId: id,
    before: { currentStatus: candidate.currentStatus },
    after: { currentStatus: targetStatus },
  });

  return updated;
}
