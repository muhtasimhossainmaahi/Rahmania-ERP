import { Role } from "@prisma/client";
import { Router } from "express";
import { requireRole } from "../../middleware/requireRole";
import { create, current, list, updateCurrent } from "./policeClearance.controller";

export const policeClearanceRouter = Router({ mergeParams: true });

// No dedicated matrix row for Police Clearance, and unlike Visa/MOFA or
// Medical, no role's one-line narrative in section 6 explicitly claims it
// either (Manpower's narrative names BMET/manpower clearance, not police
// clearance, even though section 5's workflow places them adjacently).
// No active contradiction to resolve here, just silence — so this follows
// the same precedent as PassportMovement/Contract: an administrative
// pipeline step with no specialized department, driven by Operations.
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

policeClearanceRouter.get("/", requireRole(...READ_ROLES), list);
policeClearanceRouter.get("/current", requireRole(...READ_ROLES), current);
policeClearanceRouter.post("/", requireRole(...MUTATE_ROLES), create);
policeClearanceRouter.patch("/current", requireRole(...MUTATE_ROLES), updateCurrent);
