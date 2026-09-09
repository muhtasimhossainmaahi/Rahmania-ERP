import { NextFunction, Request, Response } from "express";
import { parsePagination, paginationMeta } from "../../lib/pagination";
import { createSupplierSchema, updateSupplierSchema } from "./supplier.schema";
import {
  createSupplier,
  deactivateSupplier,
  getSupplier,
  listSuppliers,
  updateSupplier,
} from "./supplier.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req.query);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const { data, total } = await listSuppliers(pagination, search);
    res.json({ data, meta: paginationMeta(pagination.page, pagination.pageSize, total) });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getSupplier(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createSupplierSchema.parse(req.body);
    res.status(201).json(await createSupplier(input, req.user!.id));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateSupplierSchema.parse(req.body);
    res.json(await updateSupplier(req.params.id, input, req.user!.id));
  } catch (err) {
    next(err);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await deactivateSupplier(req.params.id, req.user!.id));
  } catch (err) {
    next(err);
  }
}
