import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import { TASK_MANAGER_ROLES } from "./task.service";
import { changeStatus, create, getOne, list, update } from "./task.controller";

export const taskRouter = Router();

taskRouter.use(authenticate);

// No dedicated permission-matrix row for Tasks (same situation as
// Contract/Ticket/Departure) — section 8.15's "create and assign tasks to
// departments/employees" and section 6's Operations narrative put
// creation/assignment/editing with Super Admin/Management/Operations
// (TASK_MANAGER_ROLES). Read and status-change are open to every
// authenticated role because everyone needs "My Tasks" (S18); the
// service layer scopes list/get to the caller's own assigned tasks for
// anyone outside TASK_MANAGER_ROLES, and changeTaskStatus additionally
// lets a non-manager update only their own task (e.g. marking it done).
taskRouter.get("/", list);
taskRouter.get("/:id", getOne);
taskRouter.post("/", requireRole(...TASK_MANAGER_ROLES), create);
taskRouter.patch("/:id", requireRole(...TASK_MANAGER_ROLES), update);
taskRouter.patch("/:id/status", changeStatus);
