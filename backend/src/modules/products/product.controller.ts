import { NextFunction, Request, Response } from "express";
import { parsePagination, paginationMeta } from "../../lib/pagination";
import { createProductSchema, updateProductSchema } from "./product.schema";
import {
  createProduct,
  deactivateProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "./product.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req.query);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const { data, total } = await listProducts(pagination, search);
    res.json({ data, meta: paginationMeta(pagination.page, pagination.pageSize, total) });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getProduct(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createProductSchema.parse(req.body);
    res.status(201).json(await createProduct(input, req.user!.id));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateProductSchema.parse(req.body);
    res.json(await updateProduct(req.params.id, input, req.user!.id));
  } catch (err) {
    next(err);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await deactivateProduct(req.params.id, req.user!.id));
  } catch (err) {
    next(err);
  }
}
