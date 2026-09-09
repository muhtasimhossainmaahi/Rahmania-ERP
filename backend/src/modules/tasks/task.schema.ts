import { TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1),
  candidateId: z.string().uuid().optional(),
  demandId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.coerce.date().optional(),
  remarks: z.string().min(1).optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const changeTaskStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
  remarks: z.string().min(1).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ChangeTaskStatusInput = z.infer<typeof changeTaskStatusSchema>;
