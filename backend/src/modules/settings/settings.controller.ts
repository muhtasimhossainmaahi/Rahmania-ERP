import { NextFunction, Request, Response } from "express";
import { auditContext } from "../../lib/auditContext";
import { writeAuditLog } from "../../lib/auditLog";
import { getDuplicatePassportMode, setDuplicatePassportMode } from "../../lib/settings";
import { duplicatePassportModeSchema } from "./settings.schema";

export async function getDuplicatePassportModeHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    res.json({ mode: await getDuplicatePassportMode() });
  } catch (err) {
    next(err);
  }
}

export async function updateDuplicatePassportModeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const before = await getDuplicatePassportMode();
    const input = duplicatePassportModeSchema.parse(req.body);
    await setDuplicatePassportMode(input.mode, req.user!.id);

    await writeAuditLog({
      ...auditContext(req),
      action: "SETTING_UPDATED",
      entityType: "Setting",
      entityId: "candidate.duplicate_passport_mode",
      before: { mode: before },
      after: { mode: input.mode },
    });

    res.json({ mode: input.mode });
  } catch (err) {
    next(err);
  }
}
