import { Role, TaskStatus } from "@prisma/client";
import { prisma } from "../../config/db";
import { AuditContext, writeAuditLog } from "../../lib/auditLog";
import { generateTaskNo } from "../../lib/businessId";
import { PaginationParams } from "../../lib/pagination";
import { HttpError } from "../../middleware/errorHandler";
import { Actor } from "../candidates/candidate.service";
import { CreateTaskInput, UpdateTaskInput } from "./task.schema";

// SRS 8.15's "Create and assign tasks to departments/employees" reads as
// a management/ops action; section 6 explicitly lists "tasks" under
// Operations. Mirrors Candidate's mutate set. Exported so the routes
// file's requireRole(...) list stays in sync with the service's own
// authorization checks (used for the status-change escape hatch below).
export const TASK_MANAGER_ROLES: Role[] = [Role.SUPER_ADMIN, Role.MANAGEMENT, Role.OPERATIONS];

function isTaskManager(actor: Actor): boolean {
  return TASK_MANAGER_ROLES.includes(actor.role);
}

interface ListFilters {
  status?: TaskStatus;
  candidateId?: string;
  demandId?: string;
  assignedTo?: string;
}

// Non-managers only ever see their own assigned tasks ("My Tasks", SRS
// S18) — there's no department-level scoping yet (see BUILD_NOTES open
// item on department-level access), so this is scoped to the individual
// assignee rather than their department.
export async function listTasks(pagination: PaginationParams, actor: Actor, filters: ListFilters) {
  const where: Record<string, unknown> = {};
  if (!isTaskManager(actor)) {
    where.assignedTo = actor.id;
  } else if (filters.assignedTo) {
    where.assignedTo = filters.assignedTo;
  }
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.candidateId) {
    where.candidateId = filters.candidateId;
  }
  if (filters.demandId) {
    where.demandId = filters.demandId;
  }

  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.count({ where }),
  ]);

  return { data, total };
}

export async function getTask(id: string, actor: Actor) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    throw new HttpError(404, "Task not found");
  }
  if (!isTaskManager(actor) && task.assignedTo !== actor.id) {
    throw new HttpError(403, "Not permitted to access this task");
  }
  return task;
}

async function assertReferencesValid(input: {
  candidateId?: string;
  demandId?: string;
  departmentId?: string;
  assignedTo?: string;
}) {
  if (input.candidateId) {
    const candidate = await prisma.candidate.findUnique({ where: { id: input.candidateId } });
    if (!candidate) {
      throw new HttpError(400, "Candidate not found");
    }
  }
  if (input.demandId) {
    const demand = await prisma.demand.findUnique({ where: { id: input.demandId } });
    if (!demand) {
      throw new HttpError(400, "Demand not found");
    }
  }
  if (input.departmentId) {
    const department = await prisma.department.findUnique({ where: { id: input.departmentId } });
    if (!department) {
      throw new HttpError(400, "Department not found");
    }
  }
  if (input.assignedTo) {
    const user = await prisma.user.findUnique({ where: { id: input.assignedTo } });
    if (!user) {
      throw new HttpError(400, "Assigned user not found");
    }
  }
}

export async function createTask(input: CreateTaskInput, actor: Actor, context: AuditContext) {
  await assertReferencesValid(input);

  const taskNo = await generateTaskNo();

  const task = await prisma.task.create({
    data: { ...input, taskNo, createdBy: actor.id },
  });

  await writeAuditLog({
    ...context,
    action: "TASK_CREATED",
    entityType: "Task",
    entityId: task.id,
    after: task,
  });

  return task;
}

export async function updateTask(id: string, input: UpdateTaskInput, context: AuditContext) {
  const before = await prisma.task.findUnique({ where: { id } });
  if (!before) {
    throw new HttpError(404, "Task not found");
  }

  await assertReferencesValid(input);

  const task = await prisma.task.update({ where: { id }, data: input });

  await writeAuditLog({
    ...context,
    action: "TASK_UPDATED",
    entityType: "Task",
    entityId: task.id,
    before,
    after: task,
  });

  return task;
}

// A task manager can change any task's status; the assignee can change
// only their own (e.g. marking their own task complete) — mirrors the
// read-access split above rather than requiring a manager for every
// status update.
export async function changeTaskStatus(
  id: string,
  status: TaskStatus,
  remarks: string | undefined,
  actor: Actor,
  context: AuditContext,
) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    throw new HttpError(404, "Task not found");
  }
  if (!isTaskManager(actor) && task.assignedTo !== actor.id) {
    throw new HttpError(403, "Not permitted to update this task");
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      status,
      remarks: remarks ?? task.remarks,
      completedAt: status === TaskStatus.COMPLETED ? new Date() : null,
    },
  });

  await writeAuditLog({
    ...context,
    action: "TASK_STATUS_CHANGED",
    entityType: "Task",
    entityId: id,
    before: { status: task.status },
    after: { status },
  });

  return updated;
}
