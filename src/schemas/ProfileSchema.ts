import { z } from "zod";

export const ProfileSchema = z.object({
  firstName: z.string().min(2, { message: "O nome é obrigatório." }),
  lastName: z.string().min(2, { message: "O sobrenome é obrigatório." }),
  email: z.string().email({ message: "Por favor, insira um email válido." }).optional(),
  password: z.string().min(6, { message: "A senha deve ter no mínimo 6 caracteres." }).optional(),
});

export type ProfileFormValues = z.infer<typeof ProfileSchema>;