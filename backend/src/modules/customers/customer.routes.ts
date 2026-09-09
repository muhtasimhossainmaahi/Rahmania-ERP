import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import { create, deactivate, getOne, list, update } from "./customer.controller";

export const customerRouter = Router();

customerRouter.use(authenticate);

customerRouter.get("/", list);
customerRouter.get("/:id", getOne);
customerRouter.post("/", requireRole(Role.ADMIN, Role.MANAGER, Role.SALES), create);
customerRouter.patch("/:id", requireRole(Role.ADMIN, Role.MANAGER, Role.SALES), update);
customerRouter.delete("/:id", requireRole(Role.ADMIN, Role.MANAGER, Role.SALES), deactivate);
