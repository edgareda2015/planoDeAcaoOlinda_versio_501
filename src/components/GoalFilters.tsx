import { useMemo } from "react";
import { useSectors, Goal } from "@/hooks/useGoals";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";

interface GoalFiltersProps {
  goals: Goal[] | undefined;
  selectedMonth: string; // Formato 'YYYY-MM'
  selectedSectorId: string; // UUID ou 'all'
  onMonthChange: (month: string) => void;
  onSectorChange: (sectorId: string) => void;
}

export const GoalFilters = ({
  goals,
  selectedMonth,
  selectedSectorId,
  onMonthChange,
  onSectorChange,
}: GoalFiltersProps) => {
  const { data: sectors, isLoading: isLoadingSectors } = useSectors();

  // 1. Gerar lista de meses únicos a partir das metas
  const availableMonths = useMemo(() => {
    if (!goals) return [];
    
    const monthSet = new Set<string>();
    goals.forEach(goal => {
      // Usa a data de início para determinar o mês da meta
      const monthKey = format(new Date(goal.period_start_date.replace(/-/g, '/')), "yyyy-MM");
      monthSet.add(monthKey);
    });

    // Converte o Set para Array e ordena do mais recente para o mais antigo
    return Array.from(monthSet)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(monthKey => ({
        value: monthKey,
        label: format(new Date(monthKey.replace(/-/g, '/')), "MMMM 'de' yyyy", { locale: ptBR }),
      }));
  }, [goals]);

  // 2. Gerar lista de setores (excluindo 'ORGÂNICO' e incluindo 'Todos')
  const filteredSectors = useMemo(() => {
    const allSectors = [{ id: "all", name: "Todos os Setores" }];
    const sectorList = sectors
      ?.filter(s => s.name.toUpperCase() !== 'ORGÂNICO')
      .map(s => ({ id: s.id, name: s.name })) || [];
    
    return [...allSectors, ...sectorList];
  }, [sectors]);

  if (isLoadingSectors) {
    return <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando filtros...</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* Filtro de Mês */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Filtrar por Mês</label>
        <Select onValueChange={onMonthChange} value={selectedMonth}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Meses</SelectItem>
            {availableMonths.map(month => (
              <SelectItem key={month.value} value={month.value} className="capitalize">
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filtro de Setor */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Filtrar por Setor</label>
        <Select onValueChange={onSectorChange} value={selectedSectorId}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os Setores" />
          </SelectTrigger>
          <SelectContent>
            {filteredSectors.map(sector => (
              <SelectItem key={sector.id} value={sector.id}>
                {sector.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};