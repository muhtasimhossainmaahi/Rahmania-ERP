import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import { create, deactivate, getOne, list, update } from "./department.controller";

export const departmentRouter = Router();

departmentRouter.use(authenticate);

departmentRouter.get("/", list);
departmentRouter.get("/:id", getOne);
departmentRouter.post("/", requireRole(Role.SUPER_ADMIN), create);
departmentRouter.patch("/:id", requireRole(Role.SUPER_ADMIN), update);
departmentRouter.delete("/:id", requireRole(Role.SUPER_ADMIN), deactivate);
