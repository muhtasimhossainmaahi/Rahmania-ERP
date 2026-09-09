import { NextFunction, Request, Response } from "express";
import { auditContext } from "../../lib/auditContext";
import { createBmetRecordSchema, updateBmetRecordSchema } from "./bmetRecord.schema";
import {
  createBmetRecord,
  getCurrentBmetRecord,
  listBmetRecords,
  updateCurrentBmetRecord,
} from "./bmetRecord.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await listBmetRecords(req.params.candidateId, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function current(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getCurrentBmetRecord(req.params.candidateId, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createBmetRecordSchema.parse(req.body);
    res.status(201).json(await createBmetRecord(req.params.candidateId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function updateCurrent(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateBmetRecordSchema.parse(req.body);
    res.json(await updateCurrentBmetRecord(req.params.candidateId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}
