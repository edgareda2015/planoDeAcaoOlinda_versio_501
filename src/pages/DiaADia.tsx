import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSectors } from "@/hooks/useGoals";
import { useDailyAchievements, useUpsertDailyAchievement } from "@/hooks/useDailyAchievements";
import { getSectorColors } from "@/lib/sector-config";
import { format, startOfMonth, eachDayOfInterval, endOfMonth, isSunday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { exportDailyToPdf } from "@/lib/exportUtils";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, XCircle, CalendarIcon, Save, Expand, Minimize, FileDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DailySummaryCard } from "@/components/DailySummaryCard";

const DailyLaunchSchema = z.object({
  date: z.date({ required_error: "A data é obrigatória." }),
  sector_id: z.string().uuid({ message: "Selecione um setor." }),
  achieved_quantity: z.coerce.number().min(0, "A quantidade deve ser um número positivo."),
});
type DailyLaunchFormValues = z.infer<typeof DailyLaunchSchema>;

const DiaADia = () => {
  const isMobile = useIsMobile();
  const { data: sectors, isLoading: isLoadingSectors } = useSectors();
  const { data: achievements, isLoading: isLoadingAchievements, isError } = useDailyAchievements();
  const { mutate: upsertAchievement, isPending } = useUpsertDailyAchievement();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [editingCell, setEditingCell] = useState<{ day: string; sectorId: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const form = useForm<DailyLaunchFormValues>({
    resolver: zodResolver(DailyLaunchSchema),
    defaultValues: { date: new Date(), achieved_quantity: 0, sector_id: "" },
  });

  // Setores que devem ser excluídos da visualização principal (Dia a Dia)
  const EXCLUDED_SECTORS = ['REMATRÍCULA', 'EAD', 'PÓS', 'EAD/PÓS', 'CRA', 'CRA/RETENÇÃO'];

  const displayedSectors = useMemo(() => {
    return sectors?.filter(s => 
        // Inclui todos os setores de matrícula, exceto os explicitamente excluídos
        (s.type === 'matricula' || s.name.toUpperCase() === 'ORGÂNICO') &&
        !EXCLUDED_SECTORS.includes(s.name.toUpperCase())
    ) || [];
  }, [sectors]);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(0, i), "MMMM", { locale: ptBR }),
  }));

  const availableYears = useMemo(() => {
    if (!achievements?.length) return [new Date().getFullYear()];
    const years = new Set(achievements.map(g => new Date(g.date.replace(/-/g, '/')).getFullYear()));
    if (!years.has(new Date().getFullYear())) {
        years.add(new Date().getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [achievements]);

  const monthlyData = useMemo(() => {
    if (!achievements?.length || !displayedSectors.length) return [];

    const dataByMonth: Record<string, Record<string, Record<string, number>>> = {};
    
    achievements.forEach(achievement => {
      const localDate = new Date(achievement.date.replace(/-/g, '/'));
      const monthKey = format(startOfMonth(localDate), "yyyy-MM-dd");
      const dayKey = format(localDate, "d");

      // Filtra apenas os achievements dos setores que estamos exibindo
      if (displayedSectors.some(s => s.id === achievement.sector_id)) {
        if (!dataByMonth[monthKey]) dataByMonth[monthKey] = {};
        if (!dataByMonth[monthKey][dayKey]) dataByMonth[monthKey][dayKey] = {};
        
        dataByMonth[monthKey][dayKey][achievement.sector_id] = achievement.achieved_quantity;
      }
    });

    const allMonthlyData = Object.entries(dataByMonth).map(([monthKey, daysData]) => {
      const monthDate = new Date(monthKey.replace(/-/g, '/'));
      const daysInMonth = eachDayOfInterval({ start: monthDate, end: endOfMonth(monthDate) });
      
      // Filtra os dias que já passaram ou são hoje
      const today = new Date();
      const tableRows = daysInMonth
        .filter(day => !isSunday(day) && day <= today)
        .map(day => {
          const dayKey = format(day, "d");
          const rowData: { [key: string]: string | number } = { day: dayKey };
          displayedSectors.forEach(sector => {
            rowData[sector.id] = daysData[dayKey]?.[sector.id] ?? 0;
          });
          return rowData;
        });

      const totals: { [key: string]: string | number } = { day: "Total" };
      displayedSectors.forEach(sector => {
        totals[sector.id] = tableRows.reduce((acc, row) => {
          const value = row[sector.id];
          return acc + (typeof value === 'number' ? value : 0);
        }, 0);
      });

      const lastEntries: { [key: string]: { value: number; day: string } } = {};
      displayedSectors.forEach(sector => {
        let lastEntry = { value: 0, day: '-' };
        for (let i = tableRows.length - 1; i >= 0; i--) {
            const row = tableRows[i];
            const value = row[sector.id] as number;
            if (value > 0) {
                lastEntry = { value, day: row.day as string };
                break;
            }
        }
        lastEntries[sector.id] = lastEntry;
      });

      return {
        monthKey,
        monthName: format(monthDate, "MMMM 'de' yyyy", { locale: ptBR }),
        rows: tableRows,
        totals,
        lastEntries,
      };
    });

    const selectedMonthKey = format(startOfMonth(selectedDate), "yyyy-MM-dd");
    return allMonthlyData.filter(data => data.monthKey === selectedMonthKey);

  }, [achievements, displayedSectors, selectedDate, sectors]);

  const handleMonthChange = (monthValue: string) => {
    const month = parseInt(monthValue, 10);
    setSelectedDate(currentDate => {
        const newDate = new Date(currentDate);
        newDate.setMonth(month);
        return newDate;
    });
  };

  const handleYearChange = (yearValue: string) => {
      const year = parseInt(yearValue, 10);
      setSelectedDate(currentDate => {
          const newDate = new Date(currentDate);
          newDate.setFullYear(year);
          return newDate;
      });
  };

  const onSubmit = (values: DailyLaunchFormValues) => {
    upsertAchievement(values, {
      onSuccess: () => {
        form.reset({
          ...values,
          achieved_quantity: 0,
        });
        form.setFocus("achieved_quantity");
      },
    });
  };

  const handleCellClick = (day: string, sectorId: string, currentValue: string | number) => {
    setEditingCell({ day, sectorId });
    setEditValue(String(currentValue));
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;

    const quantity = parseInt(editValue, 10);
    if (isNaN(quantity)) {
      setEditingCell(null);
      return;
    }

    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = parseInt(editingCell.day, 10);
    const date = new Date(year, month, day);

    upsertAchievement({
      date,
      sector_id: editingCell.sectorId,
      achieved_quantity: quantity,
    });

    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleExport = () => {
    if (monthlyData.length > 0) {
      const { monthName, rows, totals } = monthlyData[0];
      exportDailyToPdf(monthName, displayedSectors, rows, totals);
    }
  };

  const isLoading = isLoadingSectors || isLoadingAchievements;

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (isError) {
    return <Card className="p-6 text-destructive flex items-center"><XCircle className="h-5 w-5 mr-2" />Erro ao carregar dados.</Card>;
  }

  return (
    <div className="space-y-8">
      <div className={cn(isFullScreen && "hidden")}>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Lançamento Dia a Dia</h1>
          <p className="text-muted-foreground">
            Registre os resultados diários. Clique em uma célula na tabela para editar o valor.
          </p>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Controles</CardTitle>
            <CardDescription>Utilize os formulários abaixo para lançamentos rápidos ou para filtrar a visualização da tabela.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[2fr_1fr] lg:gap-8">
              {/* Lançamento Rápido */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 items-end gap-4 sm:grid-cols-4">
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem><FormLabel>Data</FormLabel>
                      <Popover><PopoverTrigger asChild><FormControl>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Selecione</span>}
                        </Button>
                      </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="sector_id" render={({ field }) => (
                    <FormItem><FormLabel>Setor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger></FormControl>
                        <SelectContent>{displayedSectors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <div className="grid grid-cols-2 items-end gap-2">
                    <FormField control={form.control} name="achieved_quantity" render={({ field }) => (
                      <FormItem><FormLabel>Qtd.</FormLabel>
                        <FormControl><Input type="number" placeholder="Ex: 15" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <Button type="submit" disabled={isPending} className="w-full">
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                  </div>
                </form>
              </Form>

              {/* Filtro de Visualização */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Mês</label>
                    <Select onValueChange={handleMonthChange} value={selectedDate.getMonth().toString()}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione o Mês" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map(month => (
                                <SelectItem key={month.value} value={month.value.toString()} className="capitalize">
                                    {month.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Ano</label>
                    <Select onValueChange={handleYearChange} value={selectedDate.getFullYear().toString()}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione o Ano" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableYears.map(year => (
                                <SelectItem key={year} value={year.toString()}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t pt-4">
              <Button onClick={handleExport} disabled={monthlyData.length === 0}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar Tabela para PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {monthlyData.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground capitalize">
            Resumo de {format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            {displayedSectors.map(sector => {
              const data = monthlyData[0];
              const total = data.totals[sector.id] as number;
              const lastEntry = data.lastEntries[sector.id];
              return (
                <DailySummaryCard
                  key={sector.id}
                  sectorName={sector.name}
                  totalMonth={total}
                  lastDayValue={lastEntry.value}
                  lastDayDate={lastEntry.day !== '-' ? `Dia ${lastEntry.day}` : 'N/A'}
                  color={getSectorColors(sector.name).header.bg}
                />
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-8">
        {monthlyData.length > 0 ? (
          monthlyData.map(({ monthKey, monthName, rows, totals }) => (
            <div key={monthKey} className={cn(isFullScreen && "fixed inset-0 z-50 bg-background p-4 overflow-auto")}>
              <Card className={cn("transition-all duration-300", isFullScreen && "h-full flex flex-col")}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="capitalize">{monthName}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setIsFullScreen(!isFullScreen)}>
                    {isFullScreen ? <Minimize className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
                    <span className="sr-only">{isFullScreen ? "Minimizar" : "Expandir"}</span>
                  </Button>
                </CardHeader>
                <CardContent className={cn("flex-grow", isFullScreen && "overflow-auto")}>
                  {isMobile ? (
                    <>
                      <Accordion type="single" collapsible className="w-full">
                        {rows.map(row => (
                          <AccordionItem value={`day-${row.day}`} key={row.day}>
                            <AccordionTrigger>
                              <div className="flex w-full justify-between pr-4">
                                <span>Dia {row.day}</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <ul className="space-y-2 pl-2">
                                {displayedSectors.map(sector => {
                                  const value = row[sector.id] as number;
                                  if (value > 0) {
                                    return (
                                      <li key={sector.id} className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{sector.name}</span>
                                        <span className="font-bold">{value}</span>
                                      </li>
                                    );
                                  }
                                  return null;
                                })}
                              </ul>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                      <div className="mt-4 border-t pt-4">
                        <h4 className="mb-2 font-bold">Totais do Mês</h4>
                        <ul className="space-y-2">
                          {displayedSectors.map(sector => (
                            <li key={sector.id} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{sector.name}</span>
                              <span className="font-bold">{totals[sector.id]}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table className="border-collapse">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px] border border-slate-500 dark:border-slate-400">Dia</TableHead>
                            {displayedSectors.map((sector) => (
                              <TableHead 
                                key={sector.id} 
                                className="text-center text-primary-foreground p-2 border border-slate-500 dark:border-slate-400"
                                style={{ backgroundColor: getSectorColors(sector.name).chart }}
                              >
                                {sector.name}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map(row => (
                            <TableRow key={row.day}>
                              <TableCell className="font-bold text-center border border-slate-500 dark:border-slate-400">{row.day}</TableCell>
                              {displayedSectors.map((sector) => {
                                const isEditing = editingCell?.day === row.day && editingCell?.sectorId === sector.id;
                                const currentValue = row[sector.id] as number;
                                return (
                                  <TableCell 
                                    key={sector.id} 
                                    className={cn(
                                      "text-center font-bold border border-slate-500 dark:border-slate-400 p-0",
                                      currentValue > 0 ? "text-primary" : "text-muted-foreground"
                                    )}
                                  >
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={handleSaveEdit}
                                        onKeyDown={handleKeyDown}
                                        autoFocus
                                        className="h-full w-full text-center border-0 bg-transparent focus-visible:ring-2 focus-visible:ring-ring"
                                      />
                                    ) : (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div 
                                            className="flex h-full w-full items-center justify-center p-2 cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleCellClick(String(row.day), sector.id, currentValue)}
                                          >
                                            {currentValue}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p><strong>Setor:</strong> {sector.name}</p>
                                          <p><strong>Dia:</strong> {row.day}</p>
                                          <p><strong>Qtd:</strong> {typeof currentValue === 'number' ? currentValue : "N/A"}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))
        ) : (
          <Card className={cn(isFullScreen && "hidden")}>
            <CardContent className="p-6 text-center text-muted-foreground">
                Nenhum dado encontrado para {format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DiaADia;