import { useMemo, useState } from "react";
import { DailyAchievement } from "@/hooks/useDailyAchievements";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AreaChart, // Mudança para AreaChart
  Area, // Componente Area para preenchimento
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDailyAchievements } from "@/hooks/useDailyAchievements";
import { cn } from "@/lib/utils";

interface DailyTrendChartProps {
  achievements: DailyAchievement[];
}

export const DailyTrendChart = ({ achievements }: DailyTrendChartProps) => {
  const { data: allAchievements } = useDailyAchievements();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const chartData = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    const daysInMonth = eachDayOfInterval({ start, end });

    const dailyTotals: Record<string, number> = {};
    
    achievements.forEach(ach => {
      const achDate = new Date(ach.date.replace(/-/g, '/'));
      const dateKey = format(achDate, "yyyy-MM-dd");
      
      if (achDate >= start && achDate <= end) {
        dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + ach.achieved_quantity;
      }
    });

    const dataSeries = daysInMonth.map(day => {
      const dateKey = format(day, "yyyy-MM-dd");
      const total = dailyTotals[dateKey] || 0;
      
      return {
        day: format(day, "d", { locale: ptBR }),
        date: format(day, "dd/MM", { locale: ptBR }),
        total,
      };
    });

    const today = new Date();
    return dataSeries.filter(item => {
        const itemDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), parseInt(item.day));
        return itemDate <= today;
    });

  }, [achievements, selectedDate]);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(0, i), "MMMM", { locale: ptBR }) })), []);
  
  const availableYears = useMemo(() => {
    if (!allAchievements?.length) return [new Date().getFullYear()];
    const years = new Set(allAchievements.map(g => new Date(g.date.replace(/-/g, '/')).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [allAchievements]);

  const handleMonthChange = (monthValue: string) => {
    setSelectedDate(currentDate => {
        const newDate = new Date(currentDate);
        newDate.setMonth(parseInt(monthValue, 10));
        return newDate;
    });
  };

  const handleYearChange = (yearValue: string) => {
      setSelectedDate(currentDate => {
          const newDate = new Date(currentDate);
          newDate.setFullYear(parseInt(yearValue, 10));
          return newDate;
      });
  };

  const currentMonthName = format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR });
  const totalDays = getDaysInMonth(selectedDate);
  const shouldSkipTicks = totalDays > 15;

  const tickFormatter = (value: string, index: number) => {
    if (!shouldSkipTicks) {
      return value;
    }
    // Mostra o tick a cada 5 dias (índice 0, 5, 10, 15...)
    if (index % 5 === 0) {
      return value;
    }
    return '';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-card p-3 shadow-xl text-sm">
          <p className="font-bold text-primary mb-1">Dia {data.day} ({data.date})</p>
          <p className="text-muted-foreground">Realizado: <span className="font-semibold text-foreground text-lg">{data.total}</span></p>
        </div>
      );
    }
    return null;
  };

  // Calcula a média diária para referência
  const totalAchieved = chartData.reduce((sum, item) => sum + item.total, 0);
  const daysWithData = chartData.length;
  const averageDaily = daysWithData > 0 ? totalAchieved / daysWithData : 0;

  return (
    <Card>
      <CardHeader>
        <div className="grid grid-cols-2 gap-4 md:w-1/2 mb-4">
          <Select onValueChange={handleMonthChange} value={selectedDate.getMonth().toString()}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value.toString()} className="capitalize">{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select onValueChange={handleYearChange} value={selectedDate.getFullYear().toString()}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{availableYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <CardTitle>Tendência Diária de Captação</CardTitle>
        <CardDescription>
          Volume de captação consolidada dia a dia em {currentMonthName}. 
          <span className={cn("ml-2 font-semibold", averageDaily > 0 ? "text-accent" : "text-muted-foreground")}>
            Média Diária: {averageDaily.toFixed(0)}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                {/* Definição do gradiente para a área */}
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              
              <XAxis 
                dataKey="day" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={tickFormatter}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                width={30} 
              />
              
              <Tooltip content={<CustomTooltip />} />

              {/* Linha de Referência para Média Diária */}
              {averageDaily > 0 && (
                <ReferenceLine 
                  y={averageDaily} 
                  stroke="hsl(var(--accent))" 
                  strokeDasharray="3 3" 
                  label={{ 
                    value: `Média: ${averageDaily.toFixed(0)}`, 
                    position: 'top', 
                    fill: 'hsl(var(--accent))', 
                    fontSize: 12 
                  }} 
                />
              )}

              {/* Área preenchida com gradiente */}
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="hsl(var(--primary))" 
                fill="url(#colorTotal)" 
                strokeWidth={2}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};