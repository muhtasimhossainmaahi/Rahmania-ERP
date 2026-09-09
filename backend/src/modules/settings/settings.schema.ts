import { z } from "zod";

export const duplicatePassportModeSchema = z.object({
  mode: z.enum(["BLOCK", "WARN"]),
});

export const passportCustodyOverdueDaysSchema = z.object({
  days: z.number().int().min(1),
});

export type DuplicatePassportModeInput = z.infer<typeof duplicatePassportModeSchema>;
export type PassportCustodyOverdueDaysInput = z.infer<typeof passportCustodyOverdueDaysSchema>;
