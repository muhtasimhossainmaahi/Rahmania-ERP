import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { HttpError } from "../../middleware/errorHandler";
import { Actor, assertCandidateAccess } from "../candidates/candidate.service";
import { getFile } from "../files/file.service";
import { CreateMofaRecordInput, UpdateMofaRecordInput } from "./mofaRecord.schema";

// Same pattern as MedicalRecord/Visa: identifying context inline so every
// consumer avoids a second round-trip to the Candidate module.
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

export async function listMofaRecords(candidateId: string, actor: Actor) {
  await assertCandidateAccess(candidateId, actor);
  return prisma.mofaRecord.findMany({
    where: { candidateId },
    orderBy: { createdAt: "desc" },
    include: { candidate: { select: CANDIDATE_SUMMARY_SELECT } },
  });
}

export async function getCurrentMofaRecord(candidateId: string, actor: Actor) {
  await assertCandidateAccess(candidateId, actor);
  return prisma.mofaRecord.findFirst({
    where: { candidateId, isCurrent: true },
    include: { candidate: { select: CANDIDATE_SUMMARY_SELECT } },
  });
}

export async function createMofaRecord(
  candidateId: string,
  input: CreateMofaRecordInput,
  context: AuditContext,
) {
  await assertCandidateExists(candidateId);
  if (input.fileId) {
    await getFile(input.fileId);
  }

  const previous = await prisma.mofaRecord.findFirst({ where: { candidateId, isCurrent: true } });

  const record = await prisma.$transaction(async (tx) => {
    if (previous) {
      await tx.mofaRecord.update({ where: { id: previous.id }, data: { isCurrent: false } });
    }
    return tx.mofaRecord.create({ data: { ...input, candidateId } });
  });

  await writeAuditLog({
    ...context,
    action: "MOFA_RECORD_RECORDED",
    entityType: "MofaRecord",
    entityId: record.id,
    after: record,
  });

  return record;
}

export async function updateCurrentMofaRecord(
  candidateId: string,
  input: UpdateMofaRecordInput,
  context: AuditContext,
) {
  const before = await prisma.mofaRecord.findFirst({ where: { candidateId, isCurrent: true } });
  if (!before) {
    throw new HttpError(404, "No current MOFA record for this candidate");
  }
  if (input.fileId) {
    await getFile(input.fileId);
  }

  const record = await prisma.mofaRecord.update({ where: { id: before.id }, data: input });

  await writeAuditLog({
    ...context,
    action: "MOFA_RECORD_UPDATED",
    entityType: "MofaRecord",
    entityId: record.id,
    before,
    after: record,
  });

  return record;
}
