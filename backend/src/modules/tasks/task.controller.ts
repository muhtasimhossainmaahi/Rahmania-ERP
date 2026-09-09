import { TaskStatus } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { auditContext } from "../../lib/auditContext";
import { parsePagination, paginationMeta } from "../../lib/pagination";
import { changeTaskStatusSchema, createTaskSchema, updateTaskSchema } from "./task.schema";
import { changeTaskStatus, createTask, getTask, listTasks, updateTask } from "./task.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req.query);
    const filters = {
      status: typeof req.query.status === "string" ? (req.query.status as TaskStatus) : undefined,
      candidateId: typeof req.query.candidateId === "string" ? req.query.candidateId : undefined,
      demandId: typeof req.query.demandId === "string" ? req.query.demandId : undefined,
      assignedTo: typeof req.query.assignedTo === "string" ? req.query.assignedTo : undefined,
    };
    const { data, total } = await listTasks(pagination, req.user!, filters);
    res.json({ data, meta: paginationMeta(pagination.page, pagination.pageSize, total) });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getTask(req.params.id, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createTaskSchema.parse(req.body);
    res.status(201).json(await createTask(input, req.user!, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateTaskSchema.parse(req.body);
    res.json(await updateTask(req.params.id, input, auditContext(req)));
  } catch (err) {
    next(err);
  }
}

export async function changeStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const input = changeTaskStatusSchema.parse(req.body);
    res.json(
      await changeTaskStatus(req.params.id, input.status, input.remarks, req.user!, auditContext(req)),
    );
  } catch (err) {
    next(err);
  }
}
