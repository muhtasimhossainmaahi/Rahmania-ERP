import { NextFunction, Request, Response } from "express";
import { auditContext } from "../../lib/auditContext";
import { createMofaRecordSchema, updateMofaRecordSchema } from "./mofaRecord.schema";
import {
  createMofaRecord,
  getCurrentMofaRecord,
  listMofaRecords,
  updateCurrentMofaRecord,
} from "./mofaRecord.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await listMofaRecords(req.params.candidateId, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function current(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getCurrentMofaRecord(req.params.candidateId, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createMofaRecordSchema.parse(req.body);
    res.status(201).json(await createMofaRecord(req.params.candidateId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function updateCurrent(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateMofaRecordSchema.parse(req.body);
    res.json(await updateCurrentMofaRecord(req.params.candidateId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}
