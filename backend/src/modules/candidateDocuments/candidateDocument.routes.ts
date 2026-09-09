import { Role } from "@prisma/client";
import { Router } from "express";
import { requireRole } from "../../middleware/requireRole";
import { archive, checklist, create, getOne, list, reject, verify } from "./candidateDocument.controller";

export const candidateDocumentRouter = Router({ mergeParams: true });

// Permission matrix, Documents row: Admin F, Mgmt/Ops/Accounts E,
// Marketing/Embassy/Manpower/Viewer R. Agent gets read access, scoped to
// their own candidates only (enforced in candidateDocument.service.ts via
// assertCandidateAccess), matching section 6's "own submitted candidates
// ... required documents". Medical Rep is deferred to the Medical module,
// consistent with how it's been scoped everywhere else so far.
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

candidateDocumentRouter.get("/", requireRole(...READ_ROLES), list);
candidateDocumentRouter.get("/checklist", requireRole(...READ_ROLES), checklist);
candidateDocumentRouter.get("/:documentId", requireRole(...READ_ROLES), getOne);
candidateDocumentRouter.post("/", requireRole(...MUTATE_ROLES), create);
candidateDocumentRouter.patch("/:documentId/verify", requireRole(...MUTATE_ROLES), verify);
candidateDocumentRouter.patch("/:documentId/reject", requireRole(...MUTATE_ROLES), reject);
candidateDocumentRouter.delete("/:documentId", requireRole(...MUTATE_ROLES), archive);
