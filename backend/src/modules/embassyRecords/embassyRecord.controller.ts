import { NextFunction, Request, Response } from "express";
import { auditContext } from "../../lib/auditContext";
import { createEmbassyRecordSchema, updateEmbassyRecordSchema } from "./embassyRecord.schema";
import {
  createEmbassyRecord,
  getCurrentEmbassyRecord,
  listEmbassyRecords,
  updateCurrentEmbassyRecord,
} from "./embassyRecord.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await listEmbassyRecords(req.params.candidateId, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function current(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getCurrentEmbassyRecord(req.params.candidateId, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createEmbassyRecordSchema.parse(req.body);
    res.status(201).json(await createEmbassyRecord(req.params.candidateId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function updateCurrent(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateEmbassyRecordSchema.parse(req.body);
    res.json(await updateCurrentEmbassyRecord(req.params.candidateId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}
