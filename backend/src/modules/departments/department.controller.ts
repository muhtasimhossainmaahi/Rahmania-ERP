import { NextFunction, Request, Response } from "express";
import { auditContext } from "../../lib/auditContext";
import { parsePagination, paginationMeta } from "../../lib/pagination";
import { createDepartmentSchema, updateDepartmentSchema } from "./department.schema";
import {
  createDepartment,
  deactivateDepartment,
  getDepartment,
  listDepartments,
  updateDepartment,
} from "./department.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req.query);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const { data, total } = await listDepartments(pagination, search);
    res.json({ data, meta: paginationMeta(pagination.page, pagination.pageSize, total) });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getDepartment(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createDepartmentSchema.parse(req.body);
    res.status(201).json(await createDepartment(input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateDepartmentSchema.parse(req.body);
    res.json(await updateDepartment(req.params.id, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await deactivateDepartment(req.params.id, auditContext(req)));
  } catch (err) {
    next(err);
  }
}
