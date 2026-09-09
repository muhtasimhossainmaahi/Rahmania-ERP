import { Role } from "@prisma/client";
import { Router } from "express";
import { requireRole } from "../../middleware/requireRole";
import { create, current, list, updateCurrent } from "./bmetRecord.controller";

export const bmetRecordRouter = Router({ mergeParams: true });

// Permission matrix, BMET/Manpower row: Admin F, Mgmt R, Ops R, Marketing
// R, Embassy R, Manpower E, Accounts R, Viewer R. Checked against section
// 6's role narrative before building: "Manpower: Contracts, BMET,
// manpower clearance, departure readiness" — matrix and narrative agree
// here, unlike Visa/MOFA or Medical. No decision needed; mutation is
// Admin + Manpower as the matrix states.
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
const MUTATE_ROLES = [Role.SUPER_ADMIN, Role.MANPOWER];

bmetRecordRouter.get("/", requireRole(...READ_ROLES), list);
bmetRecordRouter.get("/current", requireRole(...READ_ROLES), current);
bmetRecordRouter.post("/", requireRole(...MUTATE_ROLES), create);
bmetRecordRouter.patch("/current", requireRole(...MUTATE_ROLES), updateCurrent);
