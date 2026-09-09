import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { HttpError } from "../../middleware/errorHandler";
import { Actor, assertCandidateAccess } from "../candidates/candidate.service";
import { CreateDepartureInput, UpdateDepartureInput } from "./departure.schema";

async function assertCandidateExists(candidateId: string) {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) {
    throw new HttpError(404, "Candidate not found");
  }
  return candidate;
}

export async function getDeparture(candidateId: string, actor: Actor) {
  await assertCandidateAccess(candidateId, actor);
  return prisma.departure.findUnique({ where: { candidateId } });
}

export async function createDeparture(
  candidateId: string,
  input: CreateDepartureInput,
  context: AuditContext,
) {
  await assertCandidateExists(candidateId);

  const existing = await prisma.departure.findUnique({ where: { candidateId } });
  if (existing) {
    throw new HttpError(409, "Candidate already has a departure record");
  }

  const departure = await prisma.departure.create({
    data: { ...input, candidateId },
  });

  await writeAuditLog({
    ...context,
    action: "DEPARTURE_CREATED",
    entityType: "Departure",
    entityId: departure.id,
    after: departure,
  });

  return departure;
}

export async function updateDeparture(
  candidateId: string,
  input: UpdateDepartureInput,
  context: AuditContext,
) {
  const before = await prisma.departure.findUnique({ where: { candidateId } });
  if (!before) {
    throw new HttpError(404, "Departure record not found");
  }

  const departure = await prisma.departure.update({ where: { candidateId }, data: input });

  await writeAuditLog({
    ...context,
    action: "DEPARTURE_UPDATED",
    entityType: "Departure",
    entityId: departure.id,
    before,
    after: departure,
  });

  return departure;
}
