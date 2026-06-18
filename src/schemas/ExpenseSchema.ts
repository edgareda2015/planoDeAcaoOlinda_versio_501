import { z } from "zod";

export const ExpenseSectorSchema = z.object({
  name: z.string().min(2, { message: "O nome do setor deve ter pelo menos 2 caracteres." }),
  active: z.boolean().default(true),
});

export const ExpenseBudgetSchema = z.object({
  sector_id: z.string().uuid({ message: "Setor inválido." }),
  budget_received: z.preprocess(
    (val) => Number(val),
    z.number().min(0, { message: "O valor da verba deve ser maior ou igual a zero." })
  ),
  description: z.string().optional().nullable().or(z.literal("")),
});

export const ExpenseSchema = z.object({
  sector_id: z.string().uuid({ message: "Selecione um setor válido." }),
  purchase_date: z.date({
    required_error: "A data da compra é obrigatória.",
    invalid_type_error: "Data da compra inválida.",
  }),
  value: z.preprocess(
    (val) => Number(val),
    z.number().positive({ message: "O valor deve ser maior que zero." })
  ),
  description: z.string().min(3, { message: "A descrição deve ter pelo menos 3 caracteres." }),
  ticket_number: z.string().optional().nullable().or(z.literal("")),
  ticket_date: z.date().optional().nullable(),
  status: z.string().min(1, { message: "O status é obrigatório." }),
  observation: z.string().optional().nullable(),
});

export type ExpenseSectorFormValues = z.infer<typeof ExpenseSectorSchema>;
export type ExpenseBudgetFormValues = z.infer<typeof ExpenseBudgetSchema>;
export type ExpenseFormValues = z.infer<typeof ExpenseSchema>;
