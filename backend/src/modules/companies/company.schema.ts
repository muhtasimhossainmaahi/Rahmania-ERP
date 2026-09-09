import { z } from "zod";

export const createCompanySchema = z.object({
  companyCode: z.string().min(1),
  name: z.string().min(1),
  countryId: z.string().uuid(),
  address: z.string().min(1).optional(),
  contactPerson: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  registrationNo: z.string().min(1).optional(),
  agreementFileId: z.string().uuid().optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
