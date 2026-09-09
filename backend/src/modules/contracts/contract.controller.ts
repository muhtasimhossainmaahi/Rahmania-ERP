import { NextFunction, Request, Response } from "express";
import { auditContext } from "../../lib/auditContext";
import { createContractSchema, updateContractSchema } from "./contract.schema";
import { createContract, getContract, updateContract } from "./contract.service";

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getContract(req.params.candidateId, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createContractSchema.parse(req.body);
    res.status(201).json(await createContract(req.params.candidateId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateContractSchema.parse(req.body);
    res.json(await updateContract(req.params.candidateId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}
