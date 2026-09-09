import { z } from "zod";

export const createMofaRecordSchema = z.object({
  mofaNo: z.string().min(1).optional(),
  submissionDate: z.coerce.date().optional(),
  approvalDate: z.coerce.date().optional(),
  status: z.string().min(1).optional(),
  fileId: z.string().uuid().optional(),
  remarks: z.string().min(1).optional(),
});

export const updateMofaRecordSchema = createMofaRecordSchema.partial();

export type CreateMofaRecordInput = z.infer<typeof createMofaRecordSchema>;
export type UpdateMofaRecordInput = z.infer<typeof updateMofaRecordSchema>;
