import { CandidateDocumentStatus } from "@prisma/client";
import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { Actor, assertCandidateAccess } from "../candidates/candidate.service";
import { getFile } from "../files/file.service";
import { HttpError } from "../../middleware/errorHandler";
import { CreateCandidateDocumentInput } from "./candidateDocument.schema";

async function assertCandidateExists(candidateId: string) {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) {
    throw new HttpError(404, "Candidate not found");
  }
  return candidate;
}

export async function listCandidateDocuments(candidateId: string, actor: Actor) {
  await assertCandidateAccess(candidateId, actor);
  return prisma.candidateDocument.findMany({
    where: { candidateId },
    orderBy: [{ documentTypeId: "asc" }, { version: "desc" }],
  });
}

export async function getCandidateDocument(candidateId: string, documentId: string, actor: Actor) {
  await assertCandidateAccess(candidateId, actor);
  const document = await prisma.candidateDocument.findUnique({ where: { id: documentId } });
  if (!document || document.candidateId !== candidateId) {
    throw new HttpError(404, "Document not found");
  }
  return document;
}

// SRS 8.6 "Optional document versioning": uploading a new document for a
// documentTypeId that already has an active (non-archived) entry archives
// the old one and increments version, so re-upload after a rejection reads
// as a correction rather than a second, unrelated document.
export async function uploadCandidateDocument(
  candidateId: string,
  input: CreateCandidateDocumentInput,
  context: AuditContext,
) {
  await assertCandidateExists(candidateId);

  const documentType = await prisma.documentType.findUnique({
    where: { id: input.documentTypeId },
  });
  if (!documentType) {
    throw new HttpError(400, "Document type not found");
  }
  await getFile(input.fileId);

  const previous = await prisma.candidateDocument.findFirst({
    where: {
      candidateId,
      documentTypeId: input.documentTypeId,
      status: { not: CandidateDocumentStatus.ARCHIVED },
    },
    orderBy: { version: "desc" },
  });

  const document = await prisma.$transaction(async (tx) => {
    if (previous) {
      await tx.candidateDocument.update({
        where: { id: previous.id },
        data: { status: CandidateDocumentStatus.ARCHIVED },
      });
    }

    return tx.candidateDocument.create({
      data: {
        candidateId,
        documentTypeId: input.documentTypeId,
        fileId: input.fileId,
        issueDate: input.issueDate,
        expiryDate: input.expiryDate,
        remarks: input.remarks,
        uploadedBy: context.userId,
        version: previous ? previous.version + 1 : 1,
      },
    });
  });

  await writeAuditLog({
    ...context,
    action: "CANDIDATE_DOCUMENT_UPLOADED",
    entityType: "CandidateDocument",
    entityId: document.id,
    after: document,
  });

  return document;
}

export async function verifyCandidateDocument(
  candidateId: string,
  documentId: string,
  context: AuditContext,
) {
  const before = await prisma.candidateDocument.findUnique({ where: { id: documentId } });
  if (!before || before.candidateId !== candidateId) {
    throw new HttpError(404, "Document not found");
  }
  if (before.status === CandidateDocumentStatus.ARCHIVED) {
    throw new HttpError(400, "Cannot verify an archived document");
  }

  const document = await prisma.candidateDocument.update({
    where: { id: documentId },
    data: {
      status: CandidateDocumentStatus.VERIFIED,
      verifiedBy: context.userId,
      verifiedAt: new Date(),
    },
  });

  await writeAuditLog({
    ...context,
    action: "CANDIDATE_DOCUMENT_VERIFIED",
    entityType: "CandidateDocument",
    entityId: document.id,
    before,
    after: document,
  });

  return document;
}

export async function rejectCandidateDocument(
  candidateId: string,
  documentId: string,
  remarks: string,
  context: AuditContext,
) {
  const before = await prisma.candidateDocument.findUnique({ where: { id: documentId } });
  if (!before || before.candidateId !== candidateId) {
    throw new HttpError(404, "Document not found");
  }
  if (before.status === CandidateDocumentStatus.ARCHIVED) {
    throw new HttpError(400, "Cannot reject an archived document");
  }

  const document = await prisma.candidateDocument.update({
    where: { id: documentId },
    data: {
      status: CandidateDocumentStatus.REJECTED,
      verifiedBy: context.userId,
      verifiedAt: new Date(),
      remarks,
    },
  });

  await writeAuditLog({
    ...context,
    action: "CANDIDATE_DOCUMENT_REJECTED",
    entityType: "CandidateDocument",
    entityId: document.id,
    before,
    after: document,
  });

  return document;
}

export async function archiveCandidateDocument(
  candidateId: string,
  documentId: string,
  context: AuditContext,
) {
  const before = await prisma.candidateDocument.findUnique({ where: { id: documentId } });
  if (!before || before.candidateId !== candidateId) {
    throw new HttpError(404, "Document not found");
  }

  const document = await prisma.candidateDocument.update({
    where: { id: documentId },
    data: { status: CandidateDocumentStatus.ARCHIVED },
  });

  await writeAuditLog({
    ...context,
    action: "CANDIDATE_DOCUMENT_ARCHIVED",
    entityType: "CandidateDocument",
    entityId: document.id,
    before,
    after: document,
  });

  return document;
}

// SRS S06 "Required document checklist": mandatory document types (global,
// or scoped to the candidate's demand country) cross-referenced against
// what's already been uploaded, so the UI can show missing/pending/
// verified/rejected per required type.
export async function getDocumentChecklist(candidateId: string, actor: Actor) {
  await assertCandidateAccess(candidateId, actor);

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { demand: true },
  });
  if (!candidate) {
    throw new HttpError(404, "Candidate not found");
  }

  const countryId = candidate.demand?.countryId;

  const mandatoryTypes = await prisma.documentType.findMany({
    where: {
      mandatoryFlag: true,
      isActive: true,
      OR: countryId ? [{ countryId: null }, { countryId }] : [{ countryId: null }],
    },
  });

  const existingDocs = await prisma.candidateDocument.findMany({
    where: { candidateId, status: { not: CandidateDocumentStatus.ARCHIVED } },
  });

  return mandatoryTypes.map((type) => {
    const document = existingDocs.find((doc) => doc.documentTypeId === type.id) ?? null;
    return {
      documentType: type,
      status: document?.status ?? "MISSING",
      document,
    };
  });
}
