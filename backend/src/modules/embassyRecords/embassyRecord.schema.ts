import { z } from "zod";

export const createEmbassyRecordSchema = z.object({
  appointmentDate: z.coerce.date().optional(),
  submissionDate: z.coerce.date().optional(),
  collectionDate: z.coerce.date().optional(),
  status: z.string().min(1).optional(),
  fileId: z.string().uuid().optional(),
  remarks: z.string().min(1).optional(),
});

export const updateEmbassyRecordSchema = createEmbassyRecordSchema.partial();

export type CreateEmbassyRecordInput = z.infer<typeof createEmbassyRecordSchema>;
export type UpdateEmbassyRecordInput = z.infer<typeof updateEmbassyRecordSchema>;
