import { z } from "zod";

export const createAgentSchema = z.object({
  agentCode: z.string().min(1),
  name: z.string().min(1),
  organization: z.string().min(1).optional(),
  contactPerson: z.string().min(1).optional(),
  mobile: z.string().min(1).optional(),
  email: z.string().email().optional(),
  address: z.string().min(1).optional(),
  commissionTerms: z.string().min(1).optional(),
  agreementFileId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
});

export const updateAgentSchema = createAgentSchema.partial();

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
