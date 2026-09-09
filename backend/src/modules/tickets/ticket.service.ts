import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { HttpError } from "../../middleware/errorHandler";
import { Actor, assertCandidateAccess } from "../candidates/candidate.service";
import { getFile } from "../files/file.service";
import { CreateTicketInput, UpdateTicketInput } from "./ticket.schema";

async function assertCandidateExists(candidateId: string) {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) {
    throw new HttpError(404, "Candidate not found");
  }
  return candidate;
}

export async function getTicket(candidateId: string, actor: Actor) {
  await assertCandidateAccess(candidateId, actor);
  return prisma.ticket.findUnique({ where: { candidateId } });
}

export async function createTicket(
  candidateId: string,
  input: CreateTicketInput,
  context: AuditContext,
) {
  await assertCandidateExists(candidateId);

  const existing = await prisma.ticket.findUnique({ where: { candidateId } });
  if (existing) {
    throw new HttpError(409, "Candidate already has a ticket");
  }

  if (input.fileId) {
    await getFile(input.fileId);
  }

  const ticket = await prisma.ticket.create({
    data: { ...input, candidateId },
  });

  await writeAuditLog({
    ...context,
    action: "TICKET_CREATED",
    entityType: "Ticket",
    entityId: ticket.id,
    after: ticket,
  });

  return ticket;
}

export async function updateTicket(
  candidateId: string,
  input: UpdateTicketInput,
  context: AuditContext,
) {
  const before = await prisma.ticket.findUnique({ where: { candidateId } });
  if (!before) {
    throw new HttpError(404, "Ticket not found");
  }

  if (input.fileId) {
    await getFile(input.fileId);
  }

  const ticket = await prisma.ticket.update({ where: { candidateId }, data: input });

  await writeAuditLog({
    ...context,
    action: "TICKET_UPDATED",
    entityType: "Ticket",
    entityId: ticket.id,
    before,
    after: ticket,
  });

  return ticket;
}
