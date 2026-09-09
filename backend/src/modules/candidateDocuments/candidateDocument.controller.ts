import { NextFunction, Request, Response } from "express";
import { auditContext } from "../../lib/auditContext";
import { createCandidateDocumentSchema, rejectDocumentSchema } from "./candidateDocument.schema";
import {
  archiveCandidateDocument,
  getCandidateDocument,
  getDocumentChecklist,
  listCandidateDocuments,
  rejectCandidateDocument,
  uploadCandidateDocument,
  verifyCandidateDocument,
} from "./candidateDocument.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await listCandidateDocuments(req.params.candidateId, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function checklist(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getDocumentChecklist(req.params.candidateId, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getCandidateDocument(req.params.candidateId, req.params.documentId, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createCandidateDocumentSchema.parse(req.body);
    res
      .status(201)
      .json(await uploadCandidateDocument(req.params.candidateId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function verify(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(
      await verifyCandidateDocument(req.params.candidateId, req.params.documentId, auditContext(req)),
    );
  } catch (err) {
    next(err);
  }
}

export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    const input = rejectDocumentSchema.parse(req.body);
    res.json(
      await rejectCandidateDocument(
        req.params.candidateId,
        req.params.documentId,
        input.remarks,
        auditContext(req),
      ),
    );
  } catch (err) {
    next(err);
  }
}

export async function archive(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(
      await archiveCandidateDocument(req.params.candidateId, req.params.documentId, auditContext(req)),
    );
  } catch (err) {
    next(err);
  }
}
