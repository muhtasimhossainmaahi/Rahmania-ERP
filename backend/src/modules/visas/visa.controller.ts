import { NextFunction, Request, Response } from "express";
import { auditContext } from "../../lib/auditContext";
import { createVisaSchema, updateVisaSchema } from "./visa.schema";
import { createVisa, getCurrentVisa, listVisas, updateCurrentVisa } from "./visa.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await listVisas(req.params.candidateId, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function current(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getCurrentVisa(req.params.candidateId, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createVisaSchema.parse(req.body);
    res.status(201).json(await createVisa(req.params.candidateId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function updateCurrent(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateVisaSchema.parse(req.body);
    res.json(await updateCurrentVisa(req.params.candidateId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}
