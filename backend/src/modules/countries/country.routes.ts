import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import { create, deactivate, getOne, list, update } from "./country.controller";

export const countryRouter = Router();

countryRouter.use(authenticate);

countryRouter.get("/", list);
countryRouter.get("/:id", getOne);
countryRouter.post("/", requireRole(Role.SUPER_ADMIN), create);
countryRouter.patch("/:id", requireRole(Role.SUPER_ADMIN), update);
countryRouter.delete("/:id", requireRole(Role.SUPER_ADMIN), deactivate);
