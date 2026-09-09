import { DemandStatus } from "@prisma/client";
import { z } from "zod";

const positionSchema = z.object({
  position: z.string().min(1),
  requiredQty: z.number().int().min(1),
  salary: z.number().min(0).optional(),
  currency: z.string().min(1).optional(),
  accommodation: z.string().min(1).optional(),
  food: z.string().min(1).optional(),
  workingHours: z.string().min(1).optional(),
  benefits: z.string().min(1).optional(),
});

export const createDemandSchema = z.object({
  companyId: z.string().uuid(),
  countryId: z.string().uuid(),
  title: z.string().min(1),
  receivedDate: z.coerce.date(),
  deadline: z.coerce.date().optional(),
  notes: z.string().min(1).optional(),
  positions: z.array(positionSchema).optional(),
});

export const updateDemandSchema = z.object({
  companyId: z.string().uuid().optional(),
  countryId: z.string().uuid().optional(),
  title: z.string().min(1).optional(),
  receivedDate: z.coerce.date().optional(),
  deadline: z.coerce.date().optional(),
  notes: z.string().min(1).optional(),
  status: z.nativeEnum(DemandStatus).optional(),
});

export const createPositionSchema = positionSchema;
export const updatePositionSchema = positionSchema.partial();

export type CreateDemandInput = z.infer<typeof createDemandSchema>;
export type UpdateDemandInput = z.infer<typeof updateDemandSchema>;
export type CreatePositionInput = z.infer<typeof createPositionSchema>;
export type UpdatePositionInput = z.infer<typeof updatePositionSchema>;
