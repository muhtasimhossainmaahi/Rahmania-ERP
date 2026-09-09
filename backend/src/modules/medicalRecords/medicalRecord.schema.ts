import { MedicalStatus } from "@prisma/client";
import { z } from "zod";

export const createMedicalRecordSchema = z.object({
  center: z.string().min(1).optional(),
  appointmentDate: z.coerce.date().optional(),
  examDate: z.coerce.date().optional(),
  result: z.string().min(1).optional(),
  fitDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  fitCardFileId: z.string().uuid().optional(),
  status: z.nativeEnum(MedicalStatus).optional(),
  remarks: z.string().min(1).optional(),
});

export const updateMedicalRecordSchema = createMedicalRecordSchema.partial();

export type CreateMedicalRecordInput = z.infer<typeof createMedicalRecordSchema>;
export type UpdateMedicalRecordInput = z.infer<typeof updateMedicalRecordSchema>;
