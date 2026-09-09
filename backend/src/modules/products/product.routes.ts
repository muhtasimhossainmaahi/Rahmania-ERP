import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import { create, deactivate, getOne, list, update } from "./product.controller";

export const productRouter = Router();

productRouter.use(authenticate);

productRouter.get("/", list);
productRouter.get("/:id", getOne);
productRouter.post("/", requireRole(Role.ADMIN, Role.MANAGER, Role.WAREHOUSE), create);
productRouter.patch("/:id", requireRole(Role.ADMIN, Role.MANAGER, Role.WAREHOUSE), update);
productRouter.delete("/:id", requireRole(Role.ADMIN, Role.MANAGER, Role.WAREHOUSE), deactivate);
