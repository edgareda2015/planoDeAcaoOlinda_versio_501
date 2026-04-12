import { z } from "zod";

export const KeyActionSchema = z.object({
  course: z.string().min(2, { message: "O nome do curso / setor é obrigatório." }),
  target: z.string().min(5, { message: "A descrição do target é obrigatória." }),
  action_date: z.date({ required_error: "A data é obrigatória." }),
  expected_enrollments: z.coerce.number().min(0, { message: "A quantidade deve ser um número positivo." }),
  expected_leads: z.coerce.number().min(0, { message: "A quantidade deve ser um número positivo." }),
  budget_percentage: z.coerce.number().min(0, "A porcentagem deve ser entre 0 e 100.").max(100, "A porcentagem não pode ser maior que 100."),
});

export type KeyActionFormValues = z.infer<typeof KeyActionSchema>;