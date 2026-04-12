import { z } from "zod";

export const ActionSchema = z.object({
  unidade: z.string().min(2, { message: "O nome da unidade é obrigatório." }),
  sector_id: z.string().uuid({ message: "Selecione um setor válido." }),
  goal_id: z.string().uuid().optional().or(z.literal("")).or(z.literal("null")), // Opcional, pode ser vazio ou "null"
  description: z.string().min(5, { message: "A descrição da ação é obrigatória." }),
  how_to_do: z.string().optional(),
  responsible_name: z.string().min(2, { message: "O nome do responsável é obrigatório." }),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  status: z.enum([
    "planning", 
    "partial", 
    "completed", 
    "delayed", 
    "cancelled"
  ], { message: "Selecione um status válido." }),
  evidence_url: z.string().url({ message: "URL de evidência inválida." }).optional().or(z.literal("")),
});

export type ActionFormValues = z.infer<typeof ActionSchema>;