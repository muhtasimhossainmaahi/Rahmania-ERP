import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { HttpError } from "../../middleware/errorHandler";
import { Actor, assertCandidateAccess } from "../candidates/candidate.service";
import { getFile } from "../files/file.service";
import { CreateVisaInput, UpdateVisaInput } from "./visa.schema";

async function assertCandidateExists(candidateId: string) {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) {
    throw new HttpError(404, "Candidate not found");
  }
  return candidate;
}

export async function listVisas(candidateId: string, actor: Actor) {
  await assertCandidateAccess(candidateId, actor);
  return prisma.visa.findMany({ where: { candidateId }, orderBy: { createdAt: "desc" } });
}

export async function getCurrentVisa(candidateId: string, actor: Actor) {
  await assertCandidateAccess(candidateId, actor);
  return prisma.visa.findFirst({ where: { candidateId, isCurrent: true } });
}

// SRS 15's "zero/one or multiple visa/MOFA/medical/police/BMET records
// depending on workflow and reprocessing": a new attempt supersedes the
// current one in the same transaction, so exactly one row is ever
// isCurrent for a given candidate.
export async function createVisa(candidateId: string, input: CreateVisaInput, context: AuditContext) {
  await assertCandidateExists(candidateId);
  if (input.fileId) {
    await getFile(input.fileId);
  }

  const previous = await prisma.visa.findFirst({ where: { candidateId, isCurrent: true } });

  const visa = await prisma.$transaction(async (tx) => {
    if (previous) {
      await tx.visa.update({ where: { id: previous.id }, data: { isCurrent: false } });
    }
    return tx.visa.create({ data: { ...input, candidateId } });
  });

  await writeAuditLog({
    ...context,
    action: "VISA_RECORDED",
    entityType: "Visa",
    entityId: visa.id,
    after: visa,
  });

  return visa;
}

// Updates the current attempt in place (e.g. PENDING -> RECEIVED). Once an
// attempt is superseded by createVisa it's history and no longer editable
// through this endpoint, keeping the record of what actually happened
// immutable.
export async function updateCurrentVisa(
  candidateId: string,
  input: UpdateVisaInput,
  context: AuditContext,
) {
  const before = await prisma.visa.findFirst({ where: { candidateId, isCurrent: true } });
  if (!before) {
    throw new HttpError(404, "No current visa record for this candidate");
  }
  if (input.fileId) {
    await getFile(input.fileId);
  }

  const visa = await prisma.visa.update({ where: { id: before.id }, data: input });

  await writeAuditLog({
    ...context,
    action: "VISA_UPDATED",
    entityType: "Visa",
    entityId: visa.id,
    before,
    after: visa,
  });

  return visa;
}
