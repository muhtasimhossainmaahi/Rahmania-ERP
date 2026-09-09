import { InterviewAttendance, InterviewResult } from "@prisma/client";
import { z } from "zod";

export const createInterviewEventSchema = z.object({
  companyId: z.string().uuid(),
  demandId: z.string().uuid(),
  eventDate: z.coerce.date(),
  venue: z.string().min(1).optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  interviewer: z.string().min(1).optional(),
  capacity: z.number().int().min(1).optional(),
});

export const updateInterviewEventSchema = createInterviewEventSchema.partial().extend({
  status: z.string().min(1).optional(),
});

export const addInterviewCandidateSchema = z.object({
  candidateId: z.string().uuid(),
});

export const recordInterviewResultSchema = z.object({
  attendance: z.nativeEnum(InterviewAttendance).optional(),
  result: z.nativeEnum(InterviewResult).optional(),
  score: z.number().optional(),
  remarks: z.string().min(1).optional(),
});

export type CreateInterviewEventInput = z.infer<typeof createInterviewEventSchema>;
export type UpdateInterviewEventInput = z.infer<typeof updateInterviewEventSchema>;
export type AddInterviewCandidateInput = z.infer<typeof addInterviewCandidateSchema>;
export type RecordInterviewResultInput = z.infer<typeof recordInterviewResultSchema>;
