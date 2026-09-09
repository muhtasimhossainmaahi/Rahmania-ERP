import { NextFunction, Request, Response } from "express";
import { auditContext } from "../../lib/auditContext";
import { acknowledgeMovementSchema, createPassportMovementSchema } from "./passportMovement.schema";
import {
  acknowledgePassportMovement,
  createPassportMovement,
  getCurrentCustody,
  listPassportMovements,
} from "./passportMovement.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await listPassportMovements(req.params.candidateId, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function current(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getCurrentCustody(req.params.candidateId, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createPassportMovementSchema.parse(req.body);
    res
      .status(201)
      .json(await createPassportMovement(req.params.candidateId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function acknowledge(req: Request, res: Response, next: NextFunction) {
  try {
    const input = acknowledgeMovementSchema.parse(req.body);
    res.json(
      await acknowledgePassportMovement(
        req.params.candidateId,
        req.params.movementId,
        input,
        auditContext(req),
      ),
    );
  } catch (err) {
    next(err);
  }
}
