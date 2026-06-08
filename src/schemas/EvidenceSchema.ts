import * as z from "zod";

export const EvidenceAlbumSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
  description: z.string().optional().nullable(),
  action_id: z.string().optional().nullable(),
  responsible_name: z.string().min(2, "Insira o nome do responsável"),
  date: z.date({ required_error: "Selecione a data da ação" }),
  participants: z.string().optional().nullable(),
  leads_captured: z.coerce.number().min(0, "Leads não podem ser negativos").default(0),
  action_result: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
  cover_photo_url: z.string().optional().nullable(),
  regional_id: z.string().optional().nullable(),
  unit_id: z.string().optional().nullable(),
});

export type EvidenceAlbumFormValues = z.infer<typeof EvidenceAlbumSchema>;
