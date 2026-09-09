import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import { create, deactivate, getOne, list, update } from "./agent.controller";

export const agentRouter = Router();

agentRouter.use(authenticate);

// The permission matrix has no Agent/Medical Rep column for any module —
// section 6 scopes them narrowly to "own submitted candidates" instead of
// module-wide access. The Agent directory (commission terms, contacts) is
// also competitively sensitive between agents, so both are excluded from
// browsing it, unlike the broader read access given to reference data
// such as Company/Country/Department.
const READ_ROLES = [
  Role.SUPER_ADMIN,
  Role.MANAGEMENT,
  Role.OPERATIONS,
  Role.MARKETING,
  Role.EMBASSY,
  Role.MANPOWER,
  Role.ACCOUNTS,
  Role.VIEWER,
];
const MUTATE_ROLES = [Role.SUPER_ADMIN, Role.MANAGEMENT, Role.OPERATIONS];

agentRouter.get("/", requireRole(...READ_ROLES), list);
agentRouter.get("/:id", requireRole(...READ_ROLES), getOne);
agentRouter.post("/", requireRole(...MUTATE_ROLES), create);
agentRouter.patch("/:id", requireRole(...MUTATE_ROLES), update);
agentRouter.delete("/:id", requireRole(...MUTATE_ROLES), deactivate);
