import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { HttpError } from "../../middleware/errorHandler";
import { Actor, assertCandidateAccess } from "../candidates/candidate.service";
import { getFile } from "../files/file.service";
import { CreateBmetRecordInput, UpdateBmetRecordInput } from "./bmetRecord.schema";

// Same pattern as every other reprocessing module: identifying context
// inline so every consumer avoids a second round-trip to the Candidate
// module.
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

export async function listBmetRecords(candidateId: string, actor: Actor) {
  await assertCandidateAccess(candidateId, actor);
  return prisma.bmetRecord.findMany({
    where: { candidateId },
    orderBy: { createdAt: "desc" },
    include: { candidate: { select: CANDIDATE_SUMMARY_SELECT } },
  });
}

export async function getCurrentBmetRecord(candidateId: string, actor: Actor) {
  await assertCandidateAccess(candidateId, actor);
  return prisma.bmetRecord.findFirst({
    where: { candidateId, isCurrent: true },
    include: { candidate: { select: CANDIDATE_SUMMARY_SELECT } },
  });
}

// SRS 15 reprocessing pattern, same as Visa/MOFA/Embassy/Medical/Police:
// a new attempt (e.g. after a rejection) supersedes the current one in
// the same transaction, so exactly one row is ever current per candidate.
export async function createBmetRecord(
  candidateId: string,
  input: CreateBmetRecordInput,
  context: AuditContext,
) {
  await assertCandidateExists(candidateId);
  if (input.fileId) {
    await getFile(input.fileId);
  }

  const previous = await prisma.bmetRecord.findFirst({ where: { candidateId, isCurrent: true } });

  const record = await prisma.$transaction(async (tx) => {
    if (previous) {
      await tx.bmetRecord.update({ where: { id: previous.id }, data: { isCurrent: false } });
    }
    return tx.bmetRecord.create({ data: { ...input, candidateId } });
  });

  await writeAuditLog({
    ...context,
    action: "BMET_RECORD_RECORDED",
    entityType: "BmetRecord",
    entityId: record.id,
    after: record,
  });

  return record;
}

export async function updateCurrentBmetRecord(
  candidateId: string,
  input: UpdateBmetRecordInput,
  context: AuditContext,
) {
  const before = await prisma.bmetRecord.findFirst({ where: { candidateId, isCurrent: true } });
  if (!before) {
    throw new HttpError(404, "No current BMET record for this candidate");
  }
  if (input.fileId) {
    await getFile(input.fileId);
  }

  const record = await prisma.bmetRecord.update({ where: { id: before.id }, data: input });

  await writeAuditLog({
    ...context,
    action: "BMET_RECORD_UPDATED",
    entityType: "BmetRecord",
    entityId: record.id,
    before,
    after: record,
  });

  return record;
}
