import { z } from "zod";

export const createContractSchema = z.object({
  contractNo: z.string().min(1),
  contractDate: z.coerce.date(),
  salary: z.number().min(0).optional(),
  currency: z.string().min(1).optional(),
  duration: z.string().min(1).optional(),
  fileId: z.string().uuid().optional(),
  signedDate: z.coerce.date().optional(),
  status: z.string().min(1).optional(),
});

export const updateContractSchema = createContractSchema.partial();

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
