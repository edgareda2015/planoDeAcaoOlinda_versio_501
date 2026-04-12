import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActionSchema, ActionFormValues } from "@/schemas/ActionSchema";
import { useSectors, useGoals, Sector, Goal } from "@/hooks/useGoals";
import { useAddAction, useUpdateAction, Action } from "@/hooks/useActions";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ActionChecklist } from "./ActionChecklist";
import { Separator } from "./ui/separator";

interface ActionModalProps {
  action?: Action | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusOptions = [
  { value: "planning", label: "Planejamento" },
  { value: "partial", label: "Parcial" },
  { value: "completed", label: "Concluído" },
  { value: "delayed", label: "Atrasado" },
  { value: "cancelled", label: "Cancelado" },
];

// Componente interno para os campos do formulário, evitando duplicação de código
const ActionFormFields = ({
  form,
  sectors,
  goals,
  isLoading,
  actionId,
}: {
  form: UseFormReturn<ActionFormValues>;
  sectors: Sector[] | undefined;
  goals: Goal[] | undefined;
  isLoading: boolean;
  actionId?: string;
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
    {/* Coluna da Esquerda */}
    <div className="space-y-6">
      <FormField control={form.control} name="description" render={({ field }) => (
        <FormItem>
          <FormLabel>Ação (O Quê?) *</FormLabel>
          <FormControl><Textarea placeholder="Descreva a ação detalhadamente..." {...field} rows={5} /></FormControl>
          <FormMessage />
        </FormItem>
      )}/>
      <FormField control={form.control} name="how_to_do" render={({ field }) => (
        <FormItem>
          <FormLabel>Como será feita?</FormLabel>
          <FormControl><Textarea placeholder="Detalhes da execução, recursos necessários, etc." {...field} rows={5} /></FormControl>
          <FormMessage />
        </FormItem>
      )}/>
      {actionId && (
        <>
          <Separator />
          <ActionChecklist actionId={actionId} />
        </>
      )}
    </div>

    {/* Coluna da Direita */}
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField control={form.control} name="sector_id" render={({ field }) => (
          <FormItem>
            <FormLabel>Área/Setor *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
              <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
              <SelectContent>{sectors?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}/>
        <FormField control={form.control} name="responsible_name" render={({ field }) => (
          <FormItem>
            <FormLabel>Responsável *</FormLabel>
            <FormControl><Input placeholder="Nome completo do responsável" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}/>
      </div>
      <FormField control={form.control} name="goal_id" render={({ field }) => (
        <FormItem>
          <FormLabel>Vincular à Meta</FormLabel>
          <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
            <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
            <SelectContent>
              <SelectItem value="null">Nenhuma Meta</SelectItem>
              {goals?.map((g) => <SelectItem key={g.id} value={g.id}>{g.sectors.name} - {g.target_quantity}</SelectItem>)}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}/>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField control={form.control} name="start_date" render={({ field }) => (
          <FormItem className="flex flex-col"><FormLabel>Data Início</FormLabel>
            <Popover><PopoverTrigger asChild><FormControl>
              <Button variant="outline" className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {field.value ? format(field.value, "PPP") : <span>Selecione</span>}
              </Button>
            </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover>
            <FormMessage />
          </FormItem>
        )}/>
        <FormField control={form.control} name="end_date" render={({ field }) => (
          <FormItem className="flex flex-col"><FormLabel>Data Término</FormLabel>
            <Popover><PopoverTrigger asChild><FormControl>
              <Button variant="outline" className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {field.value ? format(field.value, "PPP") : <span>Selecione</span>}
              </Button>
            </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover>
            <FormMessage />
          </FormItem>
        )}/>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField control={form.control} name="status" render={({ field }) => (
          <FormItem>
            <FormLabel>Status *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
              <SelectContent>{statusOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}/>
        <FormField control={form.control} name="evidence_url" render={({ field }) => (
          <FormItem>
            <FormLabel>Evidências (URL)</FormLabel>
            <FormControl><Input placeholder="Link para anexos" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}/>
      </div>
      <FormField control={form.control} name="unidade" render={({ field }) => (
        <FormItem>
          <FormLabel>Unidade *</FormLabel>
          <FormControl><Input placeholder="Ex: OLINDA" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )}/>
    </div>
  </div>
);

export const ActionModal = ({ action, isOpen, onClose }: ActionModalProps) => {
  const isMobile = useIsMobile();
  const isEditMode = !!action;
  const { data: sectors, isLoading: isLoadingSectors } = useSectors();
  const { data: goals, isLoading: isLoadingGoals } = useGoals();
  const { mutate: addAction, isPending: isAdding } = useAddAction();
  const { mutate: updateAction, isPending: isUpdating } = useUpdateAction();

  const form = useForm<ActionFormValues>({
    resolver: zodResolver(ActionSchema),
    defaultValues: {
      unidade: "OLINDA",
      sector_id: "",
      goal_id: "",
      description: "",
      how_to_do: "",
      responsible_name: "",
      status: "planning",
      evidence_url: "",
    },
  });

  useEffect(() => {
    if (action) {
      form.reset({
        ...action,
        unidade: action.unidade || "OLINDA",
        goal_id: action.goal_id || "null",
        how_to_do: action.how_to_do || "",
        responsible_name: action.responsible_name || "",
        evidence_url: action.evidence_url || "",
        start_date: action.start_date ? parseISO(action.start_date) : undefined,
        end_date: action.end_date ? parseISO(action.end_date) : undefined,
      });
    } else {
      form.reset({
        unidade: "OLINDA",
        sector_id: "",
        goal_id: "",
        description: "",
        how_to_do: "",
        responsible_name: "",
        status: "planning",
        evidence_url: "",
        start_date: undefined,
        end_date: undefined,
      });
    }
  }, [action, form]);

  const onSubmit = (values: ActionFormValues) => {
    if (isEditMode) {
      updateAction({ ...values, id: action.id }, { onSuccess: onClose });
    } else {
      addAction(values, { onSuccess: onClose });
    }
  };

  const isLoading = isLoadingSectors || isLoadingGoals;
  const isPending = isAdding || isUpdating;

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{isEditMode ? "Editar Ação" : "Cadastrar Nova Ação"}</DrawerTitle>
            <DrawerDescription>
              {isEditMode ? "Altere os detalhes da ação abaixo." : "Preencha os campos para criar uma nova ação."}
            </DrawerDescription>
          </DrawerHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-[80vh] px-4">
              <ScrollArea className="flex-grow pr-4 -mr-4">
                <div className="space-y-6">
                  <ActionFormFields form={form} sectors={sectors} goals={goals} isLoading={isLoading} actionId={action?.id} />
                </div>
              </ScrollArea>
              <DrawerFooter className="pt-4 px-0 mt-auto">
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditMode ? "Salvar Alterações" : "Cadastrar Ação"}
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DrawerClose>
              </DrawerFooter>
            </form>
          </Form>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Ação" : "Cadastrar Nova Ação"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Altere os detalhes da ação abaixo." : "Preencha os campos para criar uma nova ação."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <ActionFormFields form={form} sectors={sectors} goals={goals} isLoading={isLoading} actionId={action?.id} />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Salvar Alterações" : "Cadastrar Ação"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};