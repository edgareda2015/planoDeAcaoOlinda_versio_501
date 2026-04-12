import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyActionSchema, KeyActionFormValues } from "@/schemas/KeyActionSchema";
import { KeyAction, useAddKeyAction, useUpdateKeyAction } from "@/hooks/useKeyActions";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface KeyActionModalProps {
  action?: KeyAction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const KeyActionModal = ({ action, isOpen, onClose }: KeyActionModalProps) => {
  const isEditMode = !!action;
  const { mutate: addAction, isPending: isAdding } = useAddKeyAction();
  const { mutate: updateAction, isPending: isUpdating } = useUpdateKeyAction();

  const form = useForm<KeyActionFormValues>({
    resolver: zodResolver(KeyActionSchema),
    defaultValues: {
      course: "",
      target: "",
      action_date: new Date(),
      expected_leads: 0,
      expected_enrollments: 0,
      budget_percentage: 0,
    },
  });

  useEffect(() => {
    if (action) {
      form.reset({
        ...action,
        action_date: parseISO(action.action_date),
      });
    } else {
      form.reset({
        course: "",
        target: "",
        action_date: new Date(),
        expected_leads: 0,
        expected_enrollments: 0,
        budget_percentage: 0,
      });
    }
  }, [action, form]);

  const onSubmit = (values: KeyActionFormValues) => {
    if (isEditMode) {
      updateAction({ ...values, id: action.id }, { onSuccess: onClose });
    } else {
      addAction(values, { onSuccess: onClose });
    }
  };

  const isPending = isAdding || isUpdating;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Ação Principal" : "Criar Nova Ação Principal"}</DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para {isEditMode ? "atualizar a" : "criar uma nova"} ação.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField control={form.control} name="course" render={({ field }) => (
              <FormItem>
                <FormLabel>Curso / Setor</FormLabel>
                <FormControl><Input placeholder="Ex: Direito ou Comercial" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="target" render={({ field }) => (
              <FormItem>
                <FormLabel>Target (Setor / Tipo de Empresa)</FormLabel>
                <FormControl><Textarea placeholder="Ex: Escritórios de advocacia, fóruns..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <FormField control={form.control} name="action_date" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Data</FormLabel>
                  <Popover><PopoverTrigger asChild><FormControl>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : <span>Selecione</span>}
                    </Button>
                  </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="expected_leads" render={({ field }) => (
                <FormItem>
                  <FormLabel>Qtd. Leads Esperado</FormLabel>
                  <FormControl><Input type="number" placeholder="Ex: 150" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="expected_enrollments" render={({ field }) => (
                <FormItem>
                  <FormLabel>Qtd. Matrículas Esperado</FormLabel>
                  <FormControl><Input type="number" placeholder="Ex: 25" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="budget_percentage" render={({ field }) => (
                <FormItem>
                  <FormLabel>% da Verba Utilizada</FormLabel>
                  <FormControl><Input type="number" placeholder="Ex: 50" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Salvar Alterações" : "Criar Ação"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};