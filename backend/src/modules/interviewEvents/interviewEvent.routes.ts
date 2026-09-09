import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import {
  addCandidate,
  create,
  getOne,
  list,
  recordResult,
  removeCandidate,
  update,
} from "./interviewEvent.controller";

export const interviewEventRouter = Router();

interviewEventRouter.use(authenticate);

// Permission matrix, Interview row: Admin F, Mgmt/Ops E, Marketing/
// Embassy/Manpower/Accounts/Viewer R (note: Accounts is R here, not E —
// unlike Documents/Candidates, matching the matrix literally rather than
// reusing the same role list everywhere). Agent gets read access scoped
// to events containing at least one of their own candidates, with the
// returned roster filtered to just those (service layer, not here),
// per section 6's "own submitted candidates ... interview information".
// Medical Rep excluded, consistent with every other module so far.
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

interviewEventRouter.get("/", requireRole(...READ_ROLES), list);
interviewEventRouter.get("/:id", requireRole(...READ_ROLES), getOne);
interviewEventRouter.post("/", requireRole(...MUTATE_ROLES), create);
interviewEventRouter.patch("/:id", requireRole(...MUTATE_ROLES), update);

interviewEventRouter.post("/:id/candidates", requireRole(...MUTATE_ROLES), addCandidate);
interviewEventRouter.patch("/:id/candidates/:entryId", requireRole(...MUTATE_ROLES), recordResult);
interviewEventRouter.delete("/:id/candidates/:entryId", requireRole(...MUTATE_ROLES), removeCandidate);
