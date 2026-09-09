import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import {
  getDuplicatePassportModeHandler,
  getPassportCustodyOverdueDaysHandler,
  updateDuplicatePassportModeHandler,
  updatePassportCustodyOverdueDaysHandler,
} from "./settings.controller";

export const settingsRouter = Router();

settingsRouter.use(authenticate, requireRole(Role.SUPER_ADMIN));

settingsRouter.get("/duplicate-passport-mode", getDuplicatePassportModeHandler);
settingsRouter.put("/duplicate-passport-mode", updateDuplicatePassportModeHandler);

settingsRouter.get("/passport-custody-overdue-days", getPassportCustodyOverdueDaysHandler);
settingsRouter.put("/passport-custody-overdue-days", updatePassportCustodyOverdueDaysHandler);
