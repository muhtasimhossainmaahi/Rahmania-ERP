import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { HttpError } from "../../middleware/errorHandler";
import { Actor, assertCandidateAccess } from "../candidates/candidate.service";
import { getFile } from "../files/file.service";
import { CreateEmbassyRecordInput, UpdateEmbassyRecordInput } from "./embassyRecord.schema";

// Same pattern as MedicalRecord/Visa/MofaRecord: identifying context
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

export async function listEmbassyRecords(candidateId: string, actor: Actor) {
  await assertCandidateAccess(candidateId, actor);
  return prisma.embassyRecord.findMany({
    where: { candidateId },
    orderBy: { createdAt: "desc" },
    include: { candidate: { select: CANDIDATE_SUMMARY_SELECT } },
  });
}

export async function getCurrentEmbassyRecord(candidateId: string, actor: Actor) {
  await assertCandidateAccess(candidateId, actor);
  return prisma.embassyRecord.findFirst({
    where: { candidateId, isCurrent: true },
    include: { candidate: { select: CANDIDATE_SUMMARY_SELECT } },
  });
}

export async function createEmbassyRecord(
  candidateId: string,
  input: CreateEmbassyRecordInput,
  context: AuditContext,
) {
  await assertCandidateExists(candidateId);
  if (input.fileId) {
    await getFile(input.fileId);
  }

  const previous = await prisma.embassyRecord.findFirst({ where: { candidateId, isCurrent: true } });

  const record = await prisma.$transaction(async (tx) => {
    if (previous) {
      await tx.embassyRecord.update({ where: { id: previous.id }, data: { isCurrent: false } });
    }
    return tx.embassyRecord.create({ data: { ...input, candidateId } });
  });

  await writeAuditLog({
    ...context,
    action: "EMBASSY_RECORD_RECORDED",
    entityType: "EmbassyRecord",
    entityId: record.id,
    after: record,
  });

  return record;
}

export async function updateCurrentEmbassyRecord(
  candidateId: string,
  input: UpdateEmbassyRecordInput,
  context: AuditContext,
) {
  const before = await prisma.embassyRecord.findFirst({ where: { candidateId, isCurrent: true } });
  if (!before) {
    throw new HttpError(404, "No current embassy record for this candidate");
  }
  if (input.fileId) {
    await getFile(input.fileId);
  }

  const record = await prisma.embassyRecord.update({ where: { id: before.id }, data: input });

  await writeAuditLog({
    ...context,
    action: "EMBASSY_RECORD_UPDATED",
    entityType: "EmbassyRecord",
    entityId: record.id,
    before,
    after: record,
  });

  return record;
}
