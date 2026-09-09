import { PassportMovement } from "@prisma/client";
import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { getPassportCustodyOverdueDays } from "../../lib/settings";
import { HttpError } from "../../middleware/errorHandler";
import { Actor, assertCandidateAccess } from "../candidates/candidate.service";
import { getFile } from "../files/file.service";
import { AcknowledgeMovementInput, CreatePassportMovementInput } from "./passportMovement.schema";

async function assertCandidateExists(candidateId: string) {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) {
    throw new HttpError(404, "Candidate not found");
  }
  return candidate;
}

async function assertUserExists(userId?: string) {
  if (!userId) {
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpError(400, "User not found");
  }
}

function withOverdueFlag(movement: PassportMovement, overdueDays: number) {
  const isOverdue =
    !movement.receivedAt &&
    Date.now() - movement.handedAt.getTime() > overdueDays * 24 * 60 * 60 * 1000;
  return { ...movement, isOverdue };
}

// SRS 8.7 "Show current passport location prominently on candidate
// profile" + "Flag overdue custody" for every entry in the history.
export async function listPassportMovements(candidateId: string, actor: Actor) {
  await assertCandidateAccess(candidateId, actor);
  const overdueDays = await getPassportCustodyOverdueDays();
  const movements = await prisma.passportMovement.findMany({
    where: { candidateId },
    orderBy: { handedAt: "desc" },
  });
  return movements.map((movement) => withOverdueFlag(movement, overdueDays));
}

export async function getCurrentCustody(candidateId: string, actor: Actor) {
  await assertCandidateAccess(candidateId, actor);
  const latest = await prisma.passportMovement.findFirst({
    where: { candidateId },
    orderBy: { handedAt: "desc" },
  });
  if (!latest) {
    return null;
  }
  const overdueDays = await getPassportCustodyOverdueDays();
  return withOverdueFlag(latest, overdueDays);
}

export async function createPassportMovement(
  candidateId: string,
  input: CreatePassportMovementInput,
  context: AuditContext,
) {
  await assertCandidateExists(candidateId);
  await assertUserExists(input.fromUserId);
  await assertUserExists(input.toUserId);

  // If who/where it's coming from isn't given, default to wherever the
  // last movement says it currently is — keeps the custody chain unbroken
  // without forcing every caller to look up the previous entry first. The
  // very first movement for a candidate defaults to "Candidate" (received
  // directly from them), matching SRS 8.7's "Record passport receipt".
  let fromUserId = input.fromUserId;
  let fromLocation = input.fromLocation;
  if (!fromUserId && !fromLocation) {
    const latest = await prisma.passportMovement.findFirst({
      where: { candidateId },
      orderBy: { handedAt: "desc" },
    });
    fromUserId = latest?.toUserId ?? undefined;
    fromLocation = latest?.toLocation ?? (latest ? undefined : "Candidate");
  }

  const movement = await prisma.passportMovement.create({
    data: {
      candidateId,
      fromUserId,
      toUserId: input.toUserId,
      fromLocation,
      toLocation: input.toLocation,
      purpose: input.purpose,
      remarks: input.remarks,
    },
  });

  await writeAuditLog({
    ...context,
    action: "PASSPORT_MOVEMENT_RECORDED",
    entityType: "PassportMovement",
    entityId: movement.id,
    after: movement,
  });

  return movement;
}

export async function acknowledgePassportMovement(
  candidateId: string,
  movementId: string,
  input: AcknowledgeMovementInput,
  context: AuditContext,
) {
  const before = await prisma.passportMovement.findUnique({ where: { id: movementId } });
  if (!before || before.candidateId !== candidateId) {
    throw new HttpError(404, "Passport movement not found");
  }
  if (before.receivedAt) {
    throw new HttpError(400, "This movement has already been acknowledged");
  }
  if (input.acknowledgementFileId) {
    await getFile(input.acknowledgementFileId);
  }

  const movement = await prisma.passportMovement.update({
    where: { id: movementId },
    data: {
      receivedAt: new Date(),
      acknowledgementFileId: input.acknowledgementFileId,
      remarks: input.remarks ?? before.remarks,
    },
  });

  await writeAuditLog({
    ...context,
    action: "PASSPORT_MOVEMENT_ACKNOWLEDGED",
    entityType: "PassportMovement",
    entityId: movement.id,
    before,
    after: movement,
  });

  return movement;
}
