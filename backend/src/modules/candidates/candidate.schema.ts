import { CandidateStatus } from "@prisma/client";
import { z } from "zod";

export const createCandidateSchema = z.object({
  fullName: z.string().min(1),
  fatherName: z.string().min(1).optional(),
  dob: z.coerce.date().optional(),
  gender: z.string().min(1).optional(),
  maritalStatus: z.string().min(1).optional(),
  mobile: z.string().min(3).optional(),
  altMobile: z.string().min(3).optional(),
  address: z.string().min(1).optional(),
  passportNo: z.string().min(3),
  passportIssue: z.coerce.date().optional(),
  passportExpiry: z.coerce.date().optional(),
  profession: z.string().min(1).optional(),
  experienceYears: z.number().int().min(0).optional(),
  education: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
  agentId: z.string().uuid().optional(),
  demandId: z.string().uuid().optional(),
  positionId: z.string().uuid().optional(),
  assignedEmployeeId: z.string().uuid().optional(),
  currentStatus: z.nativeEnum(CandidateStatus).optional(),
  // Only meaningful when the duplicate-passport Setting is WARN: resubmit
  // with this set to true to proceed past the warning for a genuine
  // re-registration case.
  confirmDuplicate: z.boolean().optional(),
});

export const updateCandidateSchema = createCandidateSchema
  .omit({ currentStatus: true })
  .partial();

export const changeStatusSchema = z.object({
  status: z.nativeEnum(CandidateStatus),
  remarks: z.string().min(1).optional(),
});

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;
export type UpdateCandidateInput = z.infer<typeof updateCandidateSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
