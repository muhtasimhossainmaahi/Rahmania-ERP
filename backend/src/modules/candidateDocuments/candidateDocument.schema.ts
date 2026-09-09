import { z } from "zod";

export const createCandidateDocumentSchema = z.object({
  documentTypeId: z.string().uuid(),
  fileId: z.string().uuid(),
  issueDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  remarks: z.string().min(1).optional(),
});

export const rejectDocumentSchema = z.object({
  remarks: z.string().min(1),
});

export type CreateCandidateDocumentInput = z.infer<typeof createCandidateDocumentSchema>;
export type RejectDocumentInput = z.infer<typeof rejectDocumentSchema>;
