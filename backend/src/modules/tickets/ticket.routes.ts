import { Role } from "@prisma/client";
import { Router } from "express";
import { requireRole } from "../../middleware/requireRole";
import { create, getOne, update } from "./ticket.controller";

export const ticketRouter = Router({ mergeParams: true });

// No dedicated matrix row for Ticket/Departure. Section 6's role narrative:
// "Manpower: Contracts, BMET, manpower clearance, departure readiness" —
// same reasoning as BMET's mutation gate.
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
const MUTATE_ROLES = [Role.SUPER_ADMIN, Role.MANPOWER];

ticketRouter.get("/", requireRole(...READ_ROLES), getOne);
ticketRouter.post("/", requireRole(...MUTATE_ROLES), create);
ticketRouter.patch("/", requireRole(...MUTATE_ROLES), update);
