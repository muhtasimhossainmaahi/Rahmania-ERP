import { NextFunction, Request, Response } from "express";
import { auditContext } from "../../lib/auditContext";
import { createMedicalRecordSchema, updateMedicalRecordSchema } from "./medicalRecord.schema";
import {
  createMedicalRecord,
  getCurrentMedicalRecord,
  listMedicalRecords,
  updateCurrentMedicalRecord,
} from "./medicalRecord.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await listMedicalRecords(req.params.candidateId, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function current(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getCurrentMedicalRecord(req.params.candidateId, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createMedicalRecordSchema.parse(req.body);
    res.status(201).json(await createMedicalRecord(req.params.candidateId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function updateCurrent(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateMedicalRecordSchema.parse(req.body);
    res.json(await updateCurrentMedicalRecord(req.params.candidateId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}
