import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LinkSchema, LinkFormValues } from "@/schemas/LinkSchema";
import { UsefulLink, useAddUsefulLink, useUpdateUsefulLink } from "@/hooks/useUsefulLinks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

interface LinkModalProps {
  link?: UsefulLink | null;
  isOpen: boolean;
  onClose: () => void;
  activeUnitId: string | 'all';
}

export const LinkModal = ({ link, isOpen, onClose, activeUnitId }: LinkModalProps) => {
  const isEditMode = !!link;
  const { mutate: addLink, isPending: isAdding } = useAddUsefulLink(activeUnitId);
  const { mutate: updateLink, isPending: isUpdating } = useUpdateUsefulLink();

  const form = useForm<LinkFormValues>({
    resolver: zodResolver(LinkSchema),
    defaultValues: { title: "", url: "" },
  });

  useEffect(() => {
    if (link) {
      form.reset({ title: link.title, url: link.url });
    } else {
      form.reset({ title: "", url: "" });
    }
  }, [link, form]);

  const onSubmit = (values: LinkFormValues) => {
    if (isEditMode) {
      updateLink({ ...values, id: link.id }, { onSuccess: onClose });
    } else {
      addLink(values, { onSuccess: onClose });
    }
  };

  const isPending = isAdding || isUpdating;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Link" : "Adicionar Novo Link"}</DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para {isEditMode ? "atualizar o" : "criar um novo"} link.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Portal Acadêmico" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Salvar Alterações" : "Adicionar Link"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};