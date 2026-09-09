import { z } from "zod";

export const createBmetRecordSchema = z.object({
  contractStatus: z.string().min(1).optional(),
  registrationNo: z.string().min(1).optional(),
  submissionDate: z.coerce.date().optional(),
  clearanceDate: z.coerce.date().optional(),
  smartCardNo: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  fileId: z.string().uuid().optional(),
  remarks: z.string().min(1).optional(),
});

export const updateBmetRecordSchema = createBmetRecordSchema.partial();

export type CreateBmetRecordInput = z.infer<typeof createBmetRecordSchema>;
export type UpdateBmetRecordInput = z.infer<typeof updateBmetRecordSchema>;
