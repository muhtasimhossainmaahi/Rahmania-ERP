import { PoliceClearanceStatus } from "@prisma/client";
import { z } from "zod";

export const createPoliceClearanceSchema = z.object({
  applicationDate: z.coerce.date().optional(),
  submissionDate: z.coerce.date().optional(),
  issueDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  status: z.nativeEnum(PoliceClearanceStatus).optional(),
  fileId: z.string().uuid().optional(),
  remarks: z.string().min(1).optional(),
});

export const updatePoliceClearanceSchema = createPoliceClearanceSchema.partial();

export type CreatePoliceClearanceInput = z.infer<typeof createPoliceClearanceSchema>;
export type UpdatePoliceClearanceInput = z.infer<typeof updatePoliceClearanceSchema>;
