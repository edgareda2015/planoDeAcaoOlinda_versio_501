import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GoalSchema, GoalFormValues } from "@/schemas/GoalSchema";
import { useSectors, useAddGoal } from "@/hooks/useGoals";
import { format } from "date-fns";
import { CalendarIcon, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface GoalFormProps {
  onGoalAdded: () => void;
}

export const GoalForm = ({ onGoalAdded }: GoalFormProps) => {
  const { data: sectors, isLoading: isLoadingSectors, isError: isErrorSectors } = useSectors();
  const { mutate: addGoal, isPending } = useAddGoal();

  // Filtra o setor "ORGÂNICO" para que não apareça no formulário de metas
  const filteredSectors = useMemo(() => {
    return sectors?.filter(sector => sector.name.toUpperCase() !== 'ORGÂNICO') || [];
  }, [sectors]);

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(GoalSchema),
    defaultValues: {
      target_quantity: 0,
      period_type: "monthly",
      sector_id: "",
      period_start_date: new Date(),
      period_end_date: new Date(),
    },
  });

  const onSubmit = (values: GoalFormValues) => {
    addGoal(values, {
      onSuccess: () => {
        form.reset();
        onGoalAdded();
      },
    });
  };

  if (isErrorSectors) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Erro ao carregar setores</AlertTitle>
        <AlertDescription>
          Não foi possível buscar a lista de setores do banco de dados. Verifique sua conexão ou se a tabela 'sectors' está configurada corretamente.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Setor */}
          <FormField
            control={form.control}
            name="sector_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Setor</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingSectors || !filteredSectors.length}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingSectors ? "Carregando setores..." : filteredSectors.length === 0 ? "Nenhum setor encontrado" : "Selecione o setor"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredSectors.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id}>
                        {sector.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Meta (Quantidade) */}
          <FormField
            control={form.control}
            name="target_quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meta (Quantidade)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Ex: 2213"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tipo de Período */}
          <FormField
            control={form.control}
            name="period_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Período</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="daily">Diário</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Data Início */}
          <FormField
            control={form.control}
            name="period_start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data Início</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Selecione a data</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Data Término */}
          <FormField
            control={form.control}
            name="period_end_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data Término</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Selecione a data</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isPending || isLoadingSectors || isErrorSectors || !filteredSectors.length}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Cadastrar Meta"
          )}
        </Button>
      </form>
    </Form>
  );
};