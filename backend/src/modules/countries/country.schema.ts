import { z } from "zod";

export const createCountrySchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
});

export const updateCountrySchema = createCountrySchema.partial();

export type CreateCountryInput = z.infer<typeof createCountrySchema>;
export type UpdateCountryInput = z.infer<typeof updateCountrySchema>;
