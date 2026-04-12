import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Goal, useUpdateGoal } from "@/hooks/useGoals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

interface UpdateGoalModalProps {
  goal: Goal | null;
  isOpen: boolean;
  onClose: () => void;
}

const UpdateGoalSchema = z.object({
  achieved_quantity: z.coerce.number().min(0, "O valor deve ser positivo."),
});

type UpdateGoalFormValues = z.infer<typeof UpdateGoalSchema>;

export const UpdateGoalModal = ({ goal, isOpen, onClose }: UpdateGoalModalProps) => {
  const { mutate: updateGoal, isPending } = useUpdateGoal();

  const form = useForm<UpdateGoalFormValues>({
    resolver: zodResolver(UpdateGoalSchema),
    defaultValues: {
      achieved_quantity: 0,
    },
  });

  useEffect(() => {
    if (goal) {
      form.reset({ achieved_quantity: goal.achieved_quantity });
    }
  }, [goal, form]);

  const onSubmit = (values: UpdateGoalFormValues) => {
    if (goal) {
      updateGoal({ id: goal.id, ...values }, {
        onSuccess: onClose,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atualizar Valor Realizado</DialogTitle>
          <DialogDescription>
            Insira o valor alcançado para a meta do setor <strong>{goal?.sectors.name}</strong>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="achieved_quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Realizado</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Ex: 150" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};