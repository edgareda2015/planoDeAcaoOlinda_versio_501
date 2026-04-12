import { useMemo, useState } from "react";
import { useSectors } from "@/hooks/useGoals";
import { useDailyAchievements } from "@/hooks/useDailyAchievements";
import { getSectorColors, getSectorIcon } from "@/lib/sector-config";
import { format, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, XCircle, CalendarDays, CalendarCheck, Calendar } from "lucide-react";

// Setores a serem excluídos
const EXCLUDED_SECTORS = ['REMATRÍCULA', 'EAD', 'PÓS', 'EAD/PÓS', 'CRA', 'CRA/RETENÇÃO'];

interface AchievementDetail {
  sectorName: string;
  quantity: number;
  colors: ReturnType<typeof getSectorColors>;
  icon: React.ElementType;
}

interface ProcessedDay {
  day: Date;
  dayKey: string;
  achievements: AchievementDetail[];
}

export const DailyTimeline = () => {
  const { data: sectors, isLoading: isLoadingSectors } = useSectors();
  const { data: achievements, isLoading: isLoadingAchievements, isError } = useDailyAchievements();
  const [selectedDate, setSelectedDate] = useState(startOfMonth(new Date()));

  const isLoading = isLoadingSectors || isLoadingAchievements;

  const displayedSectors = useMemo(() => {
    // Inclui todos os setores de matrícula, exceto os explicitamente excluídos.
    // O setor 'ORGÂNICO' é tratado como um setor de matrícula para fins de exibição aqui.
    return sectors?.filter(s => 
        (s.type === 'matricula' || s.name.toUpperCase() === 'ORGÂNICO') &&
        !EXCLUDED_SECTORS.includes(s.name.toUpperCase())
    ) || [];
  }, [sectors]);

  const timelineData = useMemo(() => {
    if (!achievements || !displayedSectors.length || !sectors) return { days: [] };

    // Estrutura para armazenar a data completa junto com os achievements
    const dataByDay: Record<string, { day: Date; achievements: AchievementDetail[] }> = {};

    // 1. Filtrar e agrupar lançamentos com quantidade > 0
    achievements.forEach(ach => {
      if (ach.achieved_quantity > 0) {
        const achDate = new Date(ach.date.replace(/-/g, '/'));
        if (isSameMonth(achDate, selectedDate)) {
          const dayKey = format(achDate, "d");
          const sectorInfo = sectors.find(s => s.id === ach.sector_id);
          
          // Verifica se o setor está na lista de setores a serem exibidos
          if (sectorInfo && displayedSectors.some(ds => ds.id === sectorInfo.id)) {
            if (!dataByDay[dayKey]) {
              // Armazena o objeto Date completo para ordenação
              dataByDay[dayKey] = { day: achDate, achievements: [] };
            }
            
            dataByDay[dayKey].achievements.push({
              sectorName: sectorInfo.name,
              quantity: ach.achieved_quantity,
              colors: getSectorColors(sectorInfo.name),
              icon: getSectorIcon(sectorInfo.name),
            });
          }
        }
      }
    });

    // 2. Criar uma lista ordenada de dias que tiveram eventos
    const eventDays: ProcessedDay[] = Object.entries(dataByDay)
      .map(([dayKey, data]) => ({ 
        day: data.day, // Agora acessando corretamente o objeto Date
        dayKey, 
        achievements: data.achievements 
      }))
      .sort((a, b) => a.day.getTime() - b.day.getTime());

    return { days: eventDays };
  }, [achievements, displayedSectors, selectedDate, sectors]);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(0, i), "MMMM", { locale: ptBR }) })), []);
  const availableYears = useMemo(() => {
    if (!achievements?.length) return [new Date().getFullYear()];
    const years = new Set(achievements.map(g => new Date(g.date.replace(/-/g, '/')).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [achievements]);

  const handleMonthChange = (monthValue: string) => setSelectedDate(current => new Date(current.getFullYear(), parseInt(monthValue, 10), 1));
  const handleYearChange = (yearValue: string) => setSelectedDate(current => new Date(parseInt(yearValue, 10), current.getMonth(), 1));

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (isError) return <Card className="p-6 text-destructive flex items-center"><XCircle className="h-5 w-5 mr-2" />Erro ao carregar dados.</Card>;

  const currentMonthName = format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR });
  const dayHeaderColors = [
    "bg-primary text-primary-foreground",
    "bg-accent text-accent-foreground",
    "bg-sky-500 text-white",
    "bg-violet-500 text-white",
    "bg-amber-500 text-white",
    "bg-rose-500 text-white",
    "bg-teal-500 text-white",
  ];

  // Determina o ícone do marcador final
  const today = new Date();
  const isCurrentMonth = isSameMonth(selectedDate, today);
  const EndMarkerIcon = isCurrentMonth ? CalendarCheck : Calendar;

  // Calcula a largura mínima necessária para a linha do tempo
  // Reduzido de 180px para 150px para aproximar os balões
  const minWidth = timelineData.days.length > 5 ? `${timelineData.days.length * 150}px` : '100%';

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="grid grid-cols-2 gap-4 md:w-1/2">
          <Select onValueChange={handleMonthChange} value={selectedDate.getMonth().toString()}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value.toString()} className="capitalize">{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select onValueChange={handleYearChange} value={selectedDate.getFullYear().toString()}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{availableYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="pt-4">
          <CardTitle>Linha do Tempo de Captação</CardTitle>
          <CardDescription>Eventos de captação diária para {currentMonthName}.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {/* Container principal da Timeline com rolagem horizontal */}
        <div className="relative h-[400px] overflow-x-auto overflow-y-hidden">
          <div className="flex items-center w-full h-full" style={{ minWidth }}>
            {/* Start Marker: Dia 1 */}
            <div className="flex flex-col items-center pr-4 shrink-0 h-full justify-center">
              <CalendarDays className="h-8 w-8 text-primary" />
            </div>

            {/* Timeline Track */}
            <div className="flex-grow h-1.5 bg-secondary rounded-full relative mx-4">
              {timelineData.days.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                    Nenhum lançamento registrado neste mês.
                </div>
              ) : (
                <div className="flex justify-between absolute w-full h-full top-1/2 -translate-y-1/2">
                  {timelineData.days.map(({ day, dayKey, achievements }, index) => {
                    const isTop = index % 2 === 0; // Alterna a posição (zig-zag)
                    const colorClass = dayHeaderColors[index % dayHeaderColors.length];

                    // Calcula a posição horizontal baseada no índice
                    const leftPosition = timelineData.days.length > 1 ? (index / (timelineData.days.length - 1)) * 100 : 50;

                    return (
                      <div 
                        key={dayKey} 
                        className="absolute flex flex-col items-center h-full"
                        style={{ left: `${leftPosition}%`, transform: 'translateX(-50%)' }} // Centraliza o marcador
                      >
                        {/* Day Marker */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-4 h-4 rounded-full cursor-pointer bg-primary shadow-md hover:scale-110 transition-transform"></div>
                          </TooltipTrigger>
                          <TooltipContent>{format(day, "PPP", { locale: ptBR })}</TooltipContent>
                        </Tooltip>

                        {/* Achievement Callout Container */}
                        <div className={cn(
                            "absolute w-48 p-1 flex flex-col items-center", 
                            isTop ? 'bottom-1/2 mb-12' : 'top-1/2 mt-12' // Posiciona em relação ao centro da linha
                        )}>
                            {/* Balão principal que contém todos os setores */}
                            <div className="bg-card border rounded-lg shadow-lg overflow-hidden w-48">
                                <p className={cn("text-center font-bold text-xs p-1", colorClass)}>Dia {dayKey}</p>
                                <div className="p-2 space-y-1">
                                    {achievements.map((ach, achIndex) => (
                                        <div key={achIndex} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <ach.icon className={cn("h-4 w-4 p-0.5 rounded", ach.colors.card.bg, ach.colors.card.text)} />
                                                <span className="flex-grow font-medium truncate">{ach.sectorName}</span>
                                            </div>
                                            <span className="font-bold text-primary">{ach.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Arrow (Conector) */}
                            <div className={cn(
                                "w-0 h-0 border-x-8 border-x-transparent", 
                                isTop ? "border-t-8 border-t-border" : "border-b-8 border-b-border"
                            )}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* End Marker: Hoje / Fim do Mês */}
            <div className="flex flex-col items-center pl-4 shrink-0 h-full justify-center">
              <EndMarkerIcon className="h-8 w-8 text-accent" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};