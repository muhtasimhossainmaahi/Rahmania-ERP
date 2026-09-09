import { NextFunction, Request, Response } from "express";
import { parsePagination, paginationMeta } from "../../lib/pagination";
import { createWarehouseSchema, updateWarehouseSchema } from "./warehouse.schema";
import {
  createWarehouse,
  deactivateWarehouse,
  getWarehouse,
  listWarehouses,
  updateWarehouse,
} from "./warehouse.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req.query);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const { data, total } = await listWarehouses(pagination, search);
    res.json({ data, meta: paginationMeta(pagination.page, pagination.pageSize, total) });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getWarehouse(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createWarehouseSchema.parse(req.body);
    res.status(201).json(await createWarehouse(input, req.user!.id));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateWarehouseSchema.parse(req.body);
    res.json(await updateWarehouse(req.params.id, input, req.user!.id));
  } catch (err) {
    next(err);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await deactivateWarehouse(req.params.id, req.user!.id));
  } catch (err) {
    next(err);
  }
}
