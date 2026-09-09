import { Role } from "@prisma/client";
import { Router } from "express";
import { requireRole } from "../../middleware/requireRole";
import { acknowledge, create, current, list } from "./passportMovement.controller";

export const passportMovementRouter = Router({ mergeParams: true });

// No dedicated permission-matrix row for passport custody; section 6
// names it explicitly under Operations ("Candidates, documents, status
// tracking, CV, tasks, reports, passport custody"). Reusing the
// Candidates-row read set (Agent scoped to their own candidates via
// assertCandidateAccess, Medical Rep excluded, consistent with every
// other Candidate sub-resource so far), but narrowing mutation to
// Admin/Management/Operations only — unlike Documents, Accounts has no
// stated role in physical passport handling.
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

passportMovementRouter.get("/", requireRole(...READ_ROLES), list);
passportMovementRouter.get("/current", requireRole(...READ_ROLES), current);
passportMovementRouter.post("/", requireRole(...MUTATE_ROLES), create);
passportMovementRouter.patch("/:movementId/acknowledge", requireRole(...MUTATE_ROLES), acknowledge);
