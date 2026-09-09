import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import { create, deactivate, getOne, list, update } from "./supplier.controller";

export const supplierRouter = Router();

supplierRouter.use(authenticate);

supplierRouter.get("/", list);
supplierRouter.get("/:id", getOne);
supplierRouter.post("/", requireRole(Role.ADMIN, Role.MANAGER, Role.WAREHOUSE), create);
supplierRouter.patch("/:id", requireRole(Role.ADMIN, Role.MANAGER, Role.WAREHOUSE), update);
supplierRouter.delete("/:id", requireRole(Role.ADMIN, Role.MANAGER, Role.WAREHOUSE), deactivate);
