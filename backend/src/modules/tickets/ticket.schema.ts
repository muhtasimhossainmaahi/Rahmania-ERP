import { z } from "zod";

export const createTicketSchema = z.object({
  airline: z.string().min(1).optional(),
  pnr: z.string().min(1).optional(),
  ticketNo: z.string().min(1).optional(),
  flightNo: z.string().min(1).optional(),
  departureDatetime: z.coerce.date().optional(),
  origin: z.string().min(1).optional(),
  destination: z.string().min(1).optional(),
  fileId: z.string().uuid().optional(),
  status: z.string().min(1).optional(),
});

export const updateTicketSchema = createTicketSchema.partial();

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
