import { Role } from "@prisma/client";
import { Router } from "express";
import { requireRole } from "../../middleware/requireRole";
import { create, getOne, update } from "./contract.controller";

export const contractRouter = Router({ mergeParams: true });

// No dedicated matrix row for Contract, same situation as PassportMovement.
// It's the step right after Interview in the workflow, which Operations
// drives; Accounts's stated remit (receipts/payables/invoices) doesn't
// cover drafting contract terms, so mutation is narrowed the same way as
// PassportMovement rather than reusing the Documents/Candidates role set.
const READ_ROLES = [
  Role.SUPER_ADMIN,
  Role.MANAGEMENT,
  Role.OPERATIONS,
  Role.MARKETING,
  Role.EMBASSY,
  Role.MANPOWER,
  Role.ACCOUNTS,
  Role.VIEWER,
  Role.AGENT,
];
const MUTATE_ROLES = [Role.SUPER_ADMIN, Role.MANAGEMENT, Role.OPERATIONS];

contractRouter.get("/", requireRole(...READ_ROLES), getOne);
contractRouter.post("/", requireRole(...MUTATE_ROLES), create);
contractRouter.patch("/", requireRole(...MUTATE_ROLES), update);
