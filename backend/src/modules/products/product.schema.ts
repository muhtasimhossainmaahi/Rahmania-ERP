import { z } from "zod";

export const createProductSchema = z.object({
  sku: z.string().min(1),
  barcode: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  reorderLevel: z.number().int().min(0).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
