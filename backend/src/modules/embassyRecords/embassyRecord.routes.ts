import { Role } from "@prisma/client";
import { Router } from "express";
import { requireRole } from "../../middleware/requireRole";
import { create, current, list, updateCurrent } from "./embassyRecord.controller";

export const embassyRecordRouter = Router({ mergeParams: true });

// Same Visa/MOFA matrix row (section 8.9 groups Visa & MOFA / Embassy
// together) — Marketing/Embassy treated as swapped, same reasoning as
// visa.routes.ts: mutation is Admin + Embassy.
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

embassyRecordRouter.get("/", requireRole(...READ_ROLES), list);
embassyRecordRouter.get("/current", requireRole(...READ_ROLES), current);
embassyRecordRouter.post("/", requireRole(...MUTATE_ROLES), create);
embassyRecordRouter.patch("/current", requireRole(...MUTATE_ROLES), updateCurrent);
