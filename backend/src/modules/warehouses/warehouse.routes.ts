import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import { create, deactivate, getOne, list, update } from "./warehouse.controller";

export const warehouseRouter = Router();

warehouseRouter.use(authenticate);

warehouseRouter.get("/", list);
warehouseRouter.get("/:id", getOne);
warehouseRouter.post("/", requireRole(Role.ADMIN, Role.MANAGER), create);
warehouseRouter.patch("/:id", requireRole(Role.ADMIN, Role.MANAGER), update);
warehouseRouter.delete("/:id", requireRole(Role.ADMIN, Role.MANAGER), deactivate);
