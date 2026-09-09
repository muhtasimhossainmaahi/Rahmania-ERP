import { Role } from "@prisma/client";
import { Router } from "express";
import { requireRole } from "../../middleware/requireRole";
import { create, current, list, updateCurrent } from "./medicalRecord.controller";

export const medicalRecordRouter = Router({ mergeParams: true });

// Permission matrix, Medical row: Admin F, Mgmt R, Ops R, Marketing R,
// Embassy E, Manpower R, Accounts R, Viewer R — but per explicit decision,
// this is Medical Rep's whole reason to exist (section 6) and it has no
// matrix column at all, same situation as Agent. Treated the same way as
// the Visa/MOFA decision: mutation is Admin + Medical Rep, not Admin +
// Embassy. Medical Rep is NOT scoped by ownership the way Agent is — it's
// a functional department role covering all candidates in medical
// processing, not a data-ownership role.
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
  Role.MEDICAL_REP,
];
const MUTATE_ROLES = [Role.SUPER_ADMIN, Role.MEDICAL_REP];

medicalRecordRouter.get("/", requireRole(...READ_ROLES), list);
medicalRecordRouter.get("/current", requireRole(...READ_ROLES), current);
medicalRecordRouter.post("/", requireRole(...MUTATE_ROLES), create);
medicalRecordRouter.patch("/current", requireRole(...MUTATE_ROLES), updateCurrent);
