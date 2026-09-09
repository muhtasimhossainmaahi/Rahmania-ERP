import { Role } from "@prisma/client";
import { Router } from "express";
import { requireRole } from "../../middleware/requireRole";
import { create, current, list, updateCurrent } from "./visa.controller";

export const visaRouter = Router({ mergeParams: true });

// Permission matrix, Visa/MOFA row: Admin F, Mgmt R, Ops R, Marketing E,
// Embassy R, Manpower R, Accounts R, Viewer R — but per explicit decision,
// Marketing/Embassy are treated as swapped (a transcription error): the
// matrix contradicts section 6's own role narrative, where Embassy owns
// "Visa, MOFA, Tasheer/appointment and embassy processing" and Marketing's
// narrative has no connection to it at all. So mutation here is
// Admin + Embassy, not Admin + Marketing.
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

visaRouter.get("/", requireRole(...READ_ROLES), list);
visaRouter.get("/current", requireRole(...READ_ROLES), current);
visaRouter.post("/", requireRole(...MUTATE_ROLES), create);
visaRouter.patch("/current", requireRole(...MUTATE_ROLES), updateCurrent);
