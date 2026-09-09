import { z } from "zod";

export const createPassportMovementSchema = z
  .object({
    fromUserId: z.string().uuid().optional(),
    toUserId: z.string().uuid().optional(),
    fromLocation: z.string().min(1).optional(),
    toLocation: z.string().min(1).optional(),
    purpose: z.string().min(1).optional(),
    remarks: z.string().min(1).optional(),
  })
  .refine((data) => Boolean(data.toUserId || data.toLocation), {
    message: "Either toUserId or toLocation is required",
    path: ["toUserId"],
  });

export const acknowledgeMovementSchema = z.object({
  acknowledgementFileId: z.string().uuid().optional(),
  remarks: z.string().min(1).optional(),
});

export type CreatePassportMovementInput = z.infer<typeof createPassportMovementSchema>;
export type AcknowledgeMovementInput = z.infer<typeof acknowledgeMovementSchema>;
