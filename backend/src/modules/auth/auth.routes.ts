import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import { login, me, register } from "./auth.controller";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.get("/me", authenticate, me);

// User accounts are provisioned by Super Admin, not self-service — matches
// section 6/7 of the SRS: Users/Settings is Full-control for Super Admin
// only, No access for every other role.
authRouter.post("/register", authenticate, requireRole(Role.SUPER_ADMIN), register);
