import { Role } from "@prisma/client";
import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { generateInterviewEventCode } from "../../lib/businessId";
import { PaginationParams } from "../../lib/pagination";
import { HttpError } from "../../middleware/errorHandler";
import { Actor, getOwnAgentId } from "../candidates/candidate.service";
import {
  AddInterviewCandidateInput,
  CreateInterviewEventInput,
  RecordInterviewResultInput,
  UpdateInterviewEventInput,
} from "./interviewEvent.schema";

async function assertReferencesValid(input: { companyId?: string; demandId?: string }) {
  if (input.companyId) {
    const company = await prisma.company.findUnique({ where: { id: input.companyId } });
    if (!company) {
      throw new HttpError(400, "Company not found");
    }
  }
  if (input.demandId) {
    const demand = await prisma.demand.findUnique({ where: { id: input.demandId } });
    if (!demand) {
      throw new HttpError(400, "Demand not found");
    }
    if (input.companyId && demand.companyId !== input.companyId) {
      throw new HttpError(400, "Demand does not belong to the given company");
    }
  }
}

interface ListFilters {
  search?: string;
  companyId?: string;
  demandId?: string;
}

export async function listInterviewEvents(
  pagination: PaginationParams,
  actor: Actor,
  filters: ListFilters,
) {
  const where: Record<string, unknown> = {};
  if (filters.companyId) {
    where.companyId = filters.companyId;
  }
  if (filters.demandId) {
    where.demandId = filters.demandId;
  }
  if (filters.search) {
    where.OR = [
      { eventCode: { contains: filters.search, mode: "insensitive" as const } },
      { venue: { contains: filters.search, mode: "insensitive" as const } },
    ];
  }

  if (actor.role === Role.AGENT) {
    const agentId = await getOwnAgentId(actor.id);
    if (!agentId) {
      throw new HttpError(403, "No agent profile linked to this account");
    }
    where.candidates = { some: { candidate: { agentId } } };
  }

  const [data, total] = await Promise.all([
    prisma.interviewEvent.findMany({
      where,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      orderBy: { eventDate: "desc" },
    }),
    prisma.interviewEvent.count({ where }),
  ]);

  return { data, total };
}

// Agent read access is scoped, not just role-gated: an Agent only sees
// events that include at least one of their own candidates, and even
// then only their own candidates within that event's roster — not the
// full list, per section 6's "own submitted candidates ... interview
// information" rather than broad event visibility.
export async function getInterviewEvent(id: string, actor: Actor) {
  const event = await prisma.interviewEvent.findUnique({
    where: { id },
    include: { candidates: { include: { candidate: true } } },
  });
  if (!event) {
    throw new HttpError(404, "Interview event not found");
  }

  if (actor.role === Role.AGENT) {
    const agentId = await getOwnAgentId(actor.id);
    if (!agentId) {
      throw new HttpError(403, "No agent profile linked to this account");
    }
    const scopedCandidates = event.candidates.filter((entry) => entry.candidate.agentId === agentId);
    if (scopedCandidates.length === 0) {
      throw new HttpError(403, "Not permitted to view this interview event");
    }
    return { ...event, candidates: scopedCandidates };
  }

  return event;
}

export async function createInterviewEvent(input: CreateInterviewEventInput, context: AuditContext) {
  await assertReferencesValid(input);
  const eventCode = await generateInterviewEventCode();

  const event = await prisma.interviewEvent.create({
    data: { ...input, eventCode },
  });

  await writeAuditLog({
    ...context,
    action: "INTERVIEW_EVENT_CREATED",
    entityType: "InterviewEvent",
    entityId: event.id,
    after: event,
  });

  return event;
}

export async function updateInterviewEvent(
  id: string,
  input: UpdateInterviewEventInput,
  context: AuditContext,
) {
  const before = await prisma.interviewEvent.findUnique({ where: { id } });
  if (!before) {
    throw new HttpError(404, "Interview event not found");
  }
  await assertReferencesValid(input);

  const event = await prisma.interviewEvent.update({ where: { id }, data: input });

  await writeAuditLog({
    ...context,
    action: "INTERVIEW_EVENT_UPDATED",
    entityType: "InterviewEvent",
    entityId: event.id,
    before,
    after: event,
  });

  return event;
}

export async function addCandidateToEvent(
  eventId: string,
  input: AddInterviewCandidateInput,
  context: AuditContext,
) {
  const event = await prisma.interviewEvent.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new HttpError(404, "Interview event not found");
  }
  const candidate = await prisma.candidate.findUnique({ where: { id: input.candidateId } });
  if (!candidate) {
    throw new HttpError(400, "Candidate not found");
  }

  const existing = await prisma.interviewCandidate.findUnique({
    where: { eventId_candidateId: { eventId, candidateId: input.candidateId } },
  });
  if (existing) {
    throw new HttpError(409, "Candidate is already assigned to this interview event");
  }

  const lastSerial = await prisma.interviewCandidate.findFirst({
    where: { eventId },
    orderBy: { serialNo: "desc" },
  });

  const entry = await prisma.interviewCandidate.create({
    data: {
      eventId,
      candidateId: input.candidateId,
      serialNo: (lastSerial?.serialNo ?? 0) + 1,
    },
  });

  await writeAuditLog({
    ...context,
    action: "INTERVIEW_CANDIDATE_ADDED",
    entityType: "InterviewCandidate",
    entityId: entry.id,
    after: entry,
  });

  return entry;
}

export async function recordInterviewResult(
  eventId: string,
  entryId: string,
  input: RecordInterviewResultInput,
  context: AuditContext,
) {
  const before = await prisma.interviewCandidate.findUnique({ where: { id: entryId } });
  if (!before || before.eventId !== eventId) {
    throw new HttpError(404, "Interview candidate entry not found");
  }

  const entry = await prisma.interviewCandidate.update({
    where: { id: entryId },
    data: input,
  });

  await writeAuditLog({
    ...context,
    action: "INTERVIEW_RESULT_RECORDED",
    entityType: "InterviewCandidate",
    entityId: entry.id,
    before,
    after: entry,
  });

  return entry;
}

export async function removeCandidateFromEvent(
  eventId: string,
  entryId: string,
  context: AuditContext,
) {
  const before = await prisma.interviewCandidate.findUnique({ where: { id: entryId } });
  if (!before || before.eventId !== eventId) {
    throw new HttpError(404, "Interview candidate entry not found");
  }

  await prisma.interviewCandidate.delete({ where: { id: entryId } });

  await writeAuditLog({
    ...context,
    action: "INTERVIEW_CANDIDATE_REMOVED",
    entityType: "InterviewCandidate",
    entityId: entryId,
    before,
    after: null,
  });
}
