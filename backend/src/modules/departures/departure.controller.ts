import { NextFunction, Request, Response } from "express";
import { auditContext } from "../../lib/auditContext";
import { createDepartureSchema, updateDepartureSchema } from "./departure.schema";
import { createDeparture, getDeparture, updateDeparture } from "./departure.service";

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getDeparture(req.params.candidateId, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createDepartureSchema.parse(req.body);
    res.status(201).json(await createDeparture(req.params.candidateId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateDepartureSchema.parse(req.body);
    res.json(await updateDeparture(req.params.candidateId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}
