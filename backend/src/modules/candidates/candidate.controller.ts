import { CandidateStatus } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { auditContext } from "../../lib/auditContext";
import { parsePagination, paginationMeta } from "../../lib/pagination";
import { changeStatusSchema, createCandidateSchema, updateCandidateSchema } from "./candidate.schema";
import {
  changeCandidateStatus,
  createCandidate,
  getCandidate,
  listCandidates,
  updateCandidate,
} from "./candidate.service";

function stringParam(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req.query);
    const statusParam = stringParam(req.query.status);
    const status =
      statusParam && statusParam in CandidateStatus ? (statusParam as CandidateStatus) : undefined;

    const { data, total } = await listCandidates(pagination, req.user!, {
      search: stringParam(req.query.search),
      agentId: stringParam(req.query.agentId),
      demandId: stringParam(req.query.demandId),
      status,
    });
    res.json({ data, meta: paginationMeta(pagination.page, pagination.pageSize, total) });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getCandidate(req.params.id, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createCandidateSchema.parse(req.body);
    res.status(201).json(await createCandidate(input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateCandidateSchema.parse(req.body);
    res.json(await updateCandidate(req.params.id, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function changeStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const input = changeStatusSchema.parse(req.body);
    const candidate = await changeCandidateStatus(
      req.params.id,
      input.status,
      input.remarks,
      req.user!,
      auditContext(req),
    );
    res.json(candidate);
  } catch (err) {
    next(err);
  }
}
