import { z } from "zod";

export const duplicatePassportModeSchema = z.object({
  mode: z.enum(["BLOCK", "WARN"]),
});

export type DuplicatePassportModeInput = z.infer<typeof duplicatePassportModeSchema>;
