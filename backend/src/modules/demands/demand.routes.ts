import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import {
  create,
  createPosition,
  deactivatePositionHandler,
  getOne,
  list,
  update,
  updatePositionHandler,
} from "./demand.controller";

export const demandRouter = Router();

demandRouter.use(authenticate);

// Permission matrix, Jobs/Demands row: Admin F, Management/Ops E, everyone
// else R. Read is left open to all authenticated users (unlike the Agent
// directory) since an agent plausibly needs to see demand requirements to
// know what they're recruiting for, and demand data isn't competitively
// sensitive the way agent commission terms are.
const MUTATE_ROLES = [Role.SUPER_ADMIN, Role.MANAGEMENT, Role.OPERATIONS];

demandRouter.get("/", list);
demandRouter.get("/:id", getOne);
demandRouter.post("/", requireRole(...MUTATE_ROLES), create);
demandRouter.patch("/:id", requireRole(...MUTATE_ROLES), update);

demandRouter.post("/:demandId/positions", requireRole(...MUTATE_ROLES), createPosition);
demandRouter.patch(
  "/:demandId/positions/:positionId",
  requireRole(...MUTATE_ROLES),
  updatePositionHandler,
);
demandRouter.delete(
  "/:demandId/positions/:positionId",
  requireRole(...MUTATE_ROLES),
  deactivatePositionHandler,
);
