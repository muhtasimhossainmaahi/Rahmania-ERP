import { Role } from "@prisma/client";
import { Router } from "express";
import { requireRole } from "../../middleware/requireRole";
import { create, current, list, updateCurrent } from "./mofaRecord.controller";

export const mofaRecordRouter = Router({ mergeParams: true });

// Same Visa/MOFA matrix row as Visa (section 8.9 groups Visa & MOFA /
// Embassy together) — Marketing/Embassy treated as swapped for the same
// reason documented in visa.routes.ts: mutation is Admin + Embassy.
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
const MUTATE_ROLES = [Role.SUPER_ADMIN, Role.EMBASSY];

mofaRecordRouter.get("/", requireRole(...READ_ROLES), list);
mofaRecordRouter.get("/current", requireRole(...READ_ROLES), current);
mofaRecordRouter.post("/", requireRole(...MUTATE_ROLES), create);
mofaRecordRouter.patch("/current", requireRole(...MUTATE_ROLES), updateCurrent);
