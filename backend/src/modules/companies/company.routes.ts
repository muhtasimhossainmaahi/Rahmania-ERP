import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import { create, deactivate, getOne, list, update } from "./company.controller";

export const companyRouter = Router();

companyRouter.use(authenticate);

// Permission matrix, Companies row: Admin F, Management/Ops E, everyone
// else R.
const MUTATE_ROLES = [Role.SUPER_ADMIN, Role.MANAGEMENT, Role.OPERATIONS];

companyRouter.get("/", list);
companyRouter.get("/:id", getOne);
companyRouter.post("/", requireRole(...MUTATE_ROLES), create);
companyRouter.patch("/:id", requireRole(...MUTATE_ROLES), update);
companyRouter.delete("/:id", requireRole(...MUTATE_ROLES), deactivate);
