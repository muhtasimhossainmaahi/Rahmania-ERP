import { NextFunction, Request, Response } from "express";
import { auditContext } from "../../lib/auditContext";
import { parsePagination, paginationMeta } from "../../lib/pagination";
import {
  addInterviewCandidateSchema,
  createInterviewEventSchema,
  recordInterviewResultSchema,
  updateInterviewEventSchema,
} from "./interviewEvent.schema";
import {
  addCandidateToEvent,
  createInterviewEvent,
  getInterviewEvent,
  listInterviewEvents,
  recordInterviewResult,
  removeCandidateFromEvent,
  updateInterviewEvent,
} from "./interviewEvent.service";

function stringParam(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req.query);
    const { data, total } = await listInterviewEvents(pagination, req.user!, {
      search: stringParam(req.query.search),
      companyId: stringParam(req.query.companyId),
      demandId: stringParam(req.query.demandId),
    });
    res.json({ data, meta: paginationMeta(pagination.page, pagination.pageSize, total) });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getInterviewEvent(req.params.id, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createInterviewEventSchema.parse(req.body);
    res.status(201).json(await createInterviewEvent(input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateInterviewEventSchema.parse(req.body);
    res.json(await updateInterviewEvent(req.params.id, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function addCandidate(req: Request, res: Response, next: NextFunction) {
  try {
    const input = addInterviewCandidateSchema.parse(req.body);
    res.status(201).json(await addCandidateToEvent(req.params.id, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function recordResult(req: Request, res: Response, next: NextFunction) {
  try {
    const input = recordInterviewResultSchema.parse(req.body);
    res.json(
      await recordInterviewResult(req.params.id, req.params.entryId, input, auditContext(req)),
    );
  } catch (err) {
    next(err);
  }
}

export async function removeCandidate(req: Request, res: Response, next: NextFunction) {
  try {
    await removeCandidateFromEvent(req.params.id, req.params.entryId, auditContext(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
