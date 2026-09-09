import { NextFunction, Request, Response } from "express";
import { parsePagination, paginationMeta } from "../../lib/pagination";
import { createCustomerSchema, updateCustomerSchema } from "./customer.schema";
import {
  createCustomer,
  deactivateCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from "./customer.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req.query);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const { data, total } = await listCustomers(pagination, search);
    res.json({ data, meta: paginationMeta(pagination.page, pagination.pageSize, total) });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getCustomer(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createCustomerSchema.parse(req.body);
    res.status(201).json(await createCustomer(input, req.user!.id));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateCustomerSchema.parse(req.body);
    res.json(await updateCustomer(req.params.id, input, req.user!.id));
  } catch (err) {
    next(err);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await deactivateCustomer(req.params.id, req.user!.id));
  } catch (err) {
    next(err);
  }
}
