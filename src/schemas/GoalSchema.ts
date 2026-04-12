import { z } from "zod";

export const GoalSchema = z.object({
  sector_id: z.string().uuid({ message: "Selecione um setor válido." }),
  target_quantity: z.coerce.number().min(1, { message: "A meta deve ser um número positivo." }),
  period_type: z.enum(["monthly", "daily"], { message: "Selecione um tipo de período." }),
  period_start_date: z.date({ message: "Data de início é obrigatória." }),
  period_end_date: z.date({ message: "Data de término é obrigatória." }),
});

export type GoalFormValues = z.infer<typeof GoalSchema>;