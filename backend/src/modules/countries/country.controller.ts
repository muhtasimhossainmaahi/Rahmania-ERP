import { NextFunction, Request, Response } from "express";
import { auditContext } from "../../lib/auditContext";
import { parsePagination, paginationMeta } from "../../lib/pagination";
import { createCountrySchema, updateCountrySchema } from "./country.schema";
import {
  createCountry,
  deactivateCountry,
  getCountry,
  listCountries,
  updateCountry,
} from "./country.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req.query);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const { data, total } = await listCountries(pagination, search);
    res.json({ data, meta: paginationMeta(pagination.page, pagination.pageSize, total) });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getCountry(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createCountrySchema.parse(req.body);
    res.status(201).json(await createCountry(input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateCountrySchema.parse(req.body);
    res.json(await updateCountry(req.params.id, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await deactivateCountry(req.params.id, auditContext(req)));
  } catch (err) {
    next(err);
  }
}
