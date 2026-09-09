import { z } from "zod";

export const createVisaSchema = z.object({
  visaNo: z.string().min(1).optional(),
  visaType: z.string().min(1).optional(),
  profession: z.string().min(1).optional(),
  sponsor: z.string().min(1).optional(),
  issueDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  status: z.string().min(1).optional(),
  fileId: z.string().uuid().optional(),
  remarks: z.string().min(1).optional(),
});

export const updateVisaSchema = createVisaSchema.partial();

export type CreateVisaInput = z.infer<typeof createVisaSchema>;
export type UpdateVisaInput = z.infer<typeof updateVisaSchema>;
