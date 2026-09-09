import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import { login, me, register } from "./auth.controller";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.get("/me", authenticate, me);

// User accounts are provisioned by an admin, not self-service — matches the
// ERP's internal, role-based access model rather than public signup.
authRouter.post("/register", authenticate, requireRole(Role.ADMIN), register);
