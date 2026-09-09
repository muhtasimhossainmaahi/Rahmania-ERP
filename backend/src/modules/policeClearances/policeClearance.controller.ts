import { NextFunction, Request, Response } from "express";
import { auditContext } from "../../lib/auditContext";
import { createPoliceClearanceSchema, updatePoliceClearanceSchema } from "./policeClearance.schema";
import {
  createPoliceClearance,
  getCurrentPoliceClearance,
  listPoliceClearances,
  updateCurrentPoliceClearance,
} from "./policeClearance.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await listPoliceClearances(req.params.candidateId, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function current(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getCurrentPoliceClearance(req.params.candidateId, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createPoliceClearanceSchema.parse(req.body);
    res
      .status(201)
      .json(await createPoliceClearance(req.params.candidateId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function updateCurrent(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updatePoliceClearanceSchema.parse(req.body);
    res.json(await updateCurrentPoliceClearance(req.params.candidateId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}
