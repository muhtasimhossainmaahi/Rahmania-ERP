import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { HttpError } from "../../middleware/errorHandler";
import { Actor, assertCandidateAccess } from "../candidates/candidate.service";
import { getFile } from "../files/file.service";
import { CreatePoliceClearanceInput, UpdatePoliceClearanceInput } from "./policeClearance.schema";

// Same pattern as MedicalRecord/Visa/MofaRecord/EmbassyRecord: identifying
// context inline so every consumer avoids a second round-trip to the
// Candidate module.
const CANDIDATE_SUMMARY_SELECT = {
  id: true,
  candidateCode: true,
  fullName: true,
  passportNo: true,
} as const;

async function assertCandidateExists(candidateId: string) {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) {
    throw new HttpError(404, "Candidate not found");
  }
  return candidate;
}

export async function listPoliceClearances(candidateId: string, actor: Actor) {
  await assertCandidateAccess(candidateId, actor);
  return prisma.policeClearance.findMany({
    where: { candidateId },
    orderBy: { createdAt: "desc" },
    include: { candidate: { select: CANDIDATE_SUMMARY_SELECT } },
  });
}

export async function getCurrentPoliceClearance(candidateId: string, actor: Actor) {
  await assertCandidateAccess(candidateId, actor);
  return prisma.policeClearance.findFirst({
    where: { candidateId, isCurrent: true },
    include: { candidate: { select: CANDIDATE_SUMMARY_SELECT } },
  });
}

// SRS 15 reprocessing pattern, same as Visa/MOFA/Embassy/Medical: a new
// attempt (e.g. after a rejection or expiry) supersedes the current one
// in the same transaction, so exactly one row is ever current per
// candidate.
export async function createPoliceClearance(
  candidateId: string,
  input: CreatePoliceClearanceInput,
  context: AuditContext,
) {
  await assertCandidateExists(candidateId);
  if (input.fileId) {
    await getFile(input.fileId);
  }

  const previous = await prisma.policeClearance.findFirst({
    where: { candidateId, isCurrent: true },
  });

  const clearance = await prisma.$transaction(async (tx) => {
    if (previous) {
      await tx.policeClearance.update({ where: { id: previous.id }, data: { isCurrent: false } });
    }
    return tx.policeClearance.create({ data: { ...input, candidateId } });
  });

  await writeAuditLog({
    ...context,
    action: "POLICE_CLEARANCE_RECORDED",
    entityType: "PoliceClearance",
    entityId: clearance.id,
    after: clearance,
  });

  return clearance;
}

export async function updateCurrentPoliceClearance(
  candidateId: string,
  input: UpdatePoliceClearanceInput,
  context: AuditContext,
) {
  const before = await prisma.policeClearance.findFirst({ where: { candidateId, isCurrent: true } });
  if (!before) {
    throw new HttpError(404, "No current police clearance record for this candidate");
  }
  if (input.fileId) {
    await getFile(input.fileId);
  }

  const clearance = await prisma.policeClearance.update({ where: { id: before.id }, data: input });

  await writeAuditLog({
    ...context,
    action: "POLICE_CLEARANCE_UPDATED",
    entityType: "PoliceClearance",
    entityId: clearance.id,
    before,
    after: clearance,
  });

  return clearance;
}
