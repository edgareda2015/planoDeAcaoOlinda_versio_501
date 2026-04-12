import { useState, useMemo } from "react";
import { GoalForm } from "@/components/GoalForm";
import { GoalsTable } from "@/components/GoalsTable";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { GoalFilters } from "@/components/GoalFilters";
import { useGoals } from "@/hooks/useGoals";
import { format, startOfMonth } from "date-fns";

const Metas = () => {
  const { data: allGoals, isLoading: isLoadingGoals } = useGoals();
  
  // Inicializa o filtro de mês com o mês atual (YYYY-MM)
  const currentMonthKey = format(startOfMonth(new Date()), "yyyy-MM");
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [selectedSectorId, setSelectedSectorId] = useState<string>("all");

  // Função para forçar a atualização da tabela após o cadastro
  const handleGoalAdded = () => {
    // O useGoals já invalida a query, não precisamos de nada aqui por enquanto.
  };

  const filteredGoals = useMemo(() => {
    if (isLoadingGoals || !allGoals) return [];

    return allGoals.filter(goal => {
      // 1. Filtrar por Mês
      const goalMonthKey = format(new Date(goal.period_start_date.replace(/-/g, '/')), "yyyy-MM");
      const monthMatch = selectedMonth === "all" || goalMonthKey === selectedMonth;

      // 2. Filtrar por Setor
      const sectorMatch = selectedSectorId === "all" || goal.sector_id === selectedSectorId;

      return monthMatch && sectorMatch;
    });
  }, [allGoals, selectedMonth, selectedSectorId, isLoadingGoals]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Gestão de Metas</h1>
        <p className="text-muted-foreground">
          Acompanhe e gerencie as metas de desempenho de cada setor.
        </p>
      </div>

      {/* Módulo de Cadastro */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Cadastrar Nova Meta</h2>
        <GoalForm onGoalAdded={handleGoalAdded} />
      </Card>

      <Separator />

      {/* Módulo de Filtros */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Filtrar Metas</h2>
        <GoalFilters
          goals={allGoals}
          selectedMonth={selectedMonth}
          selectedSectorId={selectedSectorId}
          onMonthChange={setSelectedMonth}
          onSectorChange={setSelectedSectorId}
        />
      </Card>

      {/* Módulo de Acompanhamento */}
      <GoalsTable goals={filteredGoals} />
    </div>
  );
};

export default Metas;