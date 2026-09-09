import { z } from "zod";

export const createDepartureSchema = z.object({
  departureDate: z.coerce.date().optional(),
  airport: z.string().min(1).optional(),
  destination: z.string().min(1).optional(),
  actualDeparture: z.coerce.date().optional(),
  deploymentStatus: z.string().min(1).optional(),
  remarks: z.string().optional(),
});

export const updateDepartureSchema = createDepartureSchema.partial();

export type CreateDepartureInput = z.infer<typeof createDepartureSchema>;
export type UpdateDepartureInput = z.infer<typeof updateDepartureSchema>;
