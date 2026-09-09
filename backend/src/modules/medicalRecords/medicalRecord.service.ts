import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { HttpError } from "../../middleware/errorHandler";
import { Actor, assertCandidateAccess } from "../candidates/candidate.service";
import { getFile } from "../files/file.service";
import { CreateMedicalRecordInput, UpdateMedicalRecordInput } from "./medicalRecord.schema";

// Medical Rep's whole reason to exist is this module, but it has no
// broad Candidate-browsing access (BUILD_NOTES #3) — so every response
// here carries just enough candidate identity to work from, without
// granting the full Candidate record.
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

export async function listMedicalRecords(candidateId: string, actor: Actor) {
  await assertCandidateAccess(candidateId, actor);
  return prisma.medicalRecord.findMany({
    where: { candidateId },
    orderBy: { createdAt: "desc" },
    include: { candidate: { select: CANDIDATE_SUMMARY_SELECT } },
  });
}

export async function getCurrentMedicalRecord(candidateId: string, actor: Actor) {
  await assertCandidateAccess(candidateId, actor);
  return prisma.medicalRecord.findFirst({
    where: { candidateId, isCurrent: true },
    include: { candidate: { select: CANDIDATE_SUMMARY_SELECT } },
  });
}

// SRS 15 reprocessing pattern, same as Visa/MOFA/Embassy: a new attempt
// (e.g. after a Retest) supersedes the current one in the same
// transaction, so exactly one row is ever current per candidate.
export async function createMedicalRecord(
  candidateId: string,
  input: CreateMedicalRecordInput,
  context: AuditContext,
) {
  await assertCandidateExists(candidateId);
  if (input.fitCardFileId) {
    await getFile(input.fitCardFileId);
  }

  const previous = await prisma.medicalRecord.findFirst({ where: { candidateId, isCurrent: true } });

  const record = await prisma.$transaction(async (tx) => {
    if (previous) {
      await tx.medicalRecord.update({ where: { id: previous.id }, data: { isCurrent: false } });
    }
    return tx.medicalRecord.create({ data: { ...input, candidateId } });
  });

  await writeAuditLog({
    ...context,
    action: "MEDICAL_RECORD_RECORDED",
    entityType: "MedicalRecord",
    entityId: record.id,
    after: record,
  });

  return record;
}

export async function updateCurrentMedicalRecord(
  candidateId: string,
  input: UpdateMedicalRecordInput,
  context: AuditContext,
) {
  const before = await prisma.medicalRecord.findFirst({ where: { candidateId, isCurrent: true } });
  if (!before) {
    throw new HttpError(404, "No current medical record for this candidate");
  }
  if (input.fitCardFileId) {
    await getFile(input.fitCardFileId);
  }

  const record = await prisma.medicalRecord.update({ where: { id: before.id }, data: input });

  await writeAuditLog({
    ...context,
    action: "MEDICAL_RECORD_UPDATED",
    entityType: "MedicalRecord",
    entityId: record.id,
    before,
    after: record,
  });

  return record;
}
