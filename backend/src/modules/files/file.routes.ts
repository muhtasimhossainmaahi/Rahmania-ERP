import { Role } from "@prisma/client";
import { Router } from "express";
import multer from "multer";
import { env } from "../../config/env";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import { archive, download, getMetadata, upload } from "./file.controller";

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.fileMaxSizeMb * 1024 * 1024 },
});

export const fileRouter = Router();

fileRouter.use(authenticate);

// Every operational role uploads documents relevant to its own module (visa
// copies, fit cards, BMET docs, agreements, etc.) — only Viewer/Auditor is
// excluded, matching its read-only row across the whole permission matrix.
const UPLOAD_ROLES = [
  Role.SUPER_ADMIN,
  Role.MANAGEMENT,
  Role.OPERATIONS,
  Role.MARKETING,
  Role.EMBASSY,
  Role.MANPOWER,
  Role.ACCOUNTS,
  Role.MEDICAL_REP,
  Role.AGENT,
];

fileRouter.post("/", requireRole(...UPLOAD_ROLES), uploadMiddleware.single("file"), upload);
fileRouter.get("/:id", getMetadata);
fileRouter.get("/:id/download", download);
fileRouter.delete("/:id", requireRole(...UPLOAD_ROLES), archive);
