import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { HttpError } from "../../middleware/errorHandler";
import { Actor, assertCandidateAccess } from "../candidates/candidate.service";
import { getFile } from "../files/file.service";
import { CreateContractInput, UpdateContractInput } from "./contract.schema";

async function assertCandidateExists(candidateId: string) {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) {
    throw new HttpError(404, "Candidate not found");
  }
  return candidate;
}

export async function getContract(candidateId: string, actor: Actor) {
  await assertCandidateAccess(candidateId, actor);
  return prisma.contract.findUnique({ where: { candidateId } });
}

export async function createContract(
  candidateId: string,
  input: CreateContractInput,
  context: AuditContext,
) {
  await assertCandidateExists(candidateId);

  const existing = await prisma.contract.findUnique({ where: { candidateId } });
  if (existing) {
    throw new HttpError(409, "Candidate already has a contract");
  }

  const duplicateNo = await prisma.contract.findUnique({ where: { contractNo: input.contractNo } });
  if (duplicateNo) {
    throw new HttpError(409, "Contract number already in use");
  }

  if (input.fileId) {
    await getFile(input.fileId);
  }

  const contract = await prisma.contract.create({
    data: { ...input, candidateId },
  });

  await writeAuditLog({
    ...context,
    action: "CONTRACT_CREATED",
    entityType: "Contract",
    entityId: contract.id,
    after: contract,
  });

  return contract;
}

export async function updateContract(
  candidateId: string,
  input: UpdateContractInput,
  context: AuditContext,
) {
  const before = await prisma.contract.findUnique({ where: { candidateId } });
  if (!before) {
    throw new HttpError(404, "Contract not found");
  }

  if (input.contractNo) {
    const duplicateNo = await prisma.contract.findUnique({ where: { contractNo: input.contractNo } });
    if (duplicateNo && duplicateNo.id !== before.id) {
      throw new HttpError(409, "Contract number already in use");
    }
  }
  if (input.fileId) {
    await getFile(input.fileId);
  }

  const contract = await prisma.contract.update({ where: { candidateId }, data: input });

  await writeAuditLog({
    ...context,
    action: "CONTRACT_UPDATED",
    entityType: "Contract",
    entityId: contract.id,
    before,
    after: contract,
  });

  return contract;
}
