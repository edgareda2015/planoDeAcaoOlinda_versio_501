import { z } from "zod";

export const LinkSchema = z.object({
  title: z.string().min(2, { message: "O título é obrigatório." }),
  url: z.string().url({ message: "Por favor, insira uma URL válida." }),
});

export type LinkFormValues = z.infer<typeof LinkSchema>;