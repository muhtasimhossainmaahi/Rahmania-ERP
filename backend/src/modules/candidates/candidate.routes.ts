import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import { bmetRecordRouter } from "../bmetRecords/bmetRecord.routes";
import { candidateDocumentRouter } from "../candidateDocuments/candidateDocument.routes";
import { contractRouter } from "../contracts/contract.routes";
import { departureRouter } from "../departures/departure.routes";
import { embassyRecordRouter } from "../embassyRecords/embassyRecord.routes";
import { medicalRecordRouter } from "../medicalRecords/medicalRecord.routes";
import { mofaRecordRouter } from "../mofaRecords/mofaRecord.routes";
import { passportMovementRouter } from "../passportMovements/passportMovement.routes";
import { policeClearanceRouter } from "../policeClearances/policeClearance.routes";
import { ticketRouter } from "../tickets/ticket.routes";
import { visaRouter } from "../visas/visa.routes";
import { changeStatus, create, getOne, list, update } from "./candidate.controller";

export const candidateRouter = Router();

candidateRouter.use(authenticate);

// Permission matrix, Candidates row: Admin F, Mgmt/Ops/Accounts E,
// Marketing/Embassy/Manpower/Viewer R. Agent and Medical Rep have no
// matrix column — section 6 scopes Agent to "own submitted candidates
// only" (enforced in candidate.service.ts, not here) and Medical Rep
// gets candidate context later through the Medical module itself rather
// than broad browsing.
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
const MUTATE_ROLES = [Role.SUPER_ADMIN, Role.MANAGEMENT, Role.OPERATIONS, Role.ACCOUNTS];

candidateRouter.get("/", requireRole(...READ_ROLES), list);
candidateRouter.get("/:id", requireRole(...READ_ROLES), getOne);
candidateRouter.post("/", requireRole(...MUTATE_ROLES), create);
candidateRouter.patch("/:id", requireRole(...MUTATE_ROLES), update);
candidateRouter.patch("/:id/status", requireRole(...MUTATE_ROLES), changeStatus);

candidateRouter.use("/:candidateId/documents", candidateDocumentRouter);
candidateRouter.use("/:candidateId/passport-movements", passportMovementRouter);
candidateRouter.use("/:candidateId/contract", contractRouter);
candidateRouter.use("/:candidateId/visa", visaRouter);
candidateRouter.use("/:candidateId/mofa", mofaRecordRouter);
candidateRouter.use("/:candidateId/embassy", embassyRecordRouter);
candidateRouter.use("/:candidateId/medical", medicalRecordRouter);
candidateRouter.use("/:candidateId/police-clearance", policeClearanceRouter);
candidateRouter.use("/:candidateId/bmet", bmetRecordRouter);
candidateRouter.use("/:candidateId/ticket", ticketRouter);
candidateRouter.use("/:candidateId/departure", departureRouter);
