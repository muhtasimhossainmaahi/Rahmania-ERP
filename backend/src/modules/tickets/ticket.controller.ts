import { NextFunction, Request, Response } from "express";
import { auditContext } from "../../lib/auditContext";
import { createTicketSchema, updateTicketSchema } from "./ticket.schema";
import { createTicket, getTicket, updateTicket } from "./ticket.service";

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getTicket(req.params.candidateId, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createTicketSchema.parse(req.body);
    res.status(201).json(await createTicket(req.params.candidateId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateTicketSchema.parse(req.body);
    res.json(await updateTicket(req.params.candidateId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}
