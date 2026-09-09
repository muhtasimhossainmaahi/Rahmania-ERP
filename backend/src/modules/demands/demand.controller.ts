import { NextFunction, Request, Response } from "express";
import { auditContext } from "../../lib/auditContext";
import { parsePagination, paginationMeta } from "../../lib/pagination";
import {
  createDemandSchema,
  createPositionSchema,
  updateDemandSchema,
  updatePositionSchema,
} from "./demand.schema";
import {
  addPosition,
  createDemand,
  deactivatePosition,
  getDemand,
  listDemands,
  updateDemand,
  updatePosition,
} from "./demand.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req.query);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const { data, total } = await listDemands(pagination, search);
    res.json({ data, meta: paginationMeta(pagination.page, pagination.pageSize, total) });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getDemand(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createDemandSchema.parse(req.body);
    res.status(201).json(await createDemand(input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateDemandSchema.parse(req.body);
    res.json(await updateDemand(req.params.id, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function createPosition(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createPositionSchema.parse(req.body);
    res.status(201).json(await addPosition(req.params.demandId, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function updatePositionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updatePositionSchema.parse(req.body);
    res.json(
      await updatePosition(req.params.demandId, req.params.positionId, input, auditContext(req)),
    );
  } catch (err) {
    next(err);
  }
}

export async function deactivatePositionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await deactivatePosition(req.params.demandId, req.params.positionId, auditContext(req)));
  } catch (err) {
    next(err);
  }
}
