import { Target, TrendingUp, Users, CheckCircle, Loader2, XCircle, Leaf } from "lucide-react";
import { MetricCard } from "./MetricCard";
import { SectorCard } from "./SectorCard";
import { useGoals, useSectors } from "@/hooks/useGoals";
import { useActions } from "@/hooks/useActions";
import { useDailyAchievements } from "@/hooks/useDailyAchievements";
import { Card } from "@/components/ui/card";
import { SectorPerformanceChart } from "./SectorPerformanceChart";
import { DailyTimeline } from "./DailyTimeline";
import { DailyTrendChart } from "./DailyTrendChart"; // Importar novo gráfico
import { getSectorIcon, getSectorColors } from "@/lib/sector-config";
import { TotalProgressTracker } from "./TotalProgressTracker";
import { useMemo } from "react";

type SectorStatus = "excellent" | "good" | "regular" | "attention" | "critical";

const calculateSectorStatus = (achieved: number, goal: number): SectorStatus => {
  if (goal === 0) {
    return achieved > 0 ? "excellent" : "regular";
  }
  const percentage = (achieved / goal) * 100;

  if (percentage > 80) return "excellent";
  if (percentage > 60) return "good";
  if (percentage > 40) return "regular";
  if (percentage > 20) return "attention";
  return "critical";
};

// Setores a serem excluídos dos totais do dashboard
const EXCLUDED_SECTORS = ['REMATRÍCULA', 'EAD', 'EAD/PÓS', 'PÓS', 'CRA', 'CRA/RETENÇÃO'];

export const Dashboard = () => {
  const { data: goals, isLoading: isLoadingGoals, isError: isErrorGoals } = useGoals();
  const { data: actions, isLoading: isLoadingActions, isError: isErrorActions } = useActions();
  const { data: sectors, isLoading: isLoadingSectors } = useSectors();
  const { data: achievements, isLoading: isLoadingAchievements, isError: isErrorAchievements } = useDailyAchievements();

  const isLoading = isLoadingGoals || isLoadingActions || isLoadingSectors || isLoadingAchievements;
  const isError = isErrorGoals || isErrorActions || isErrorAchievements;

  const mainSectorIds = useMemo(() => {
    return sectors?.filter(s => !EXCLUDED_SECTORS.includes(s.name.toUpperCase())).map(s => s.id) || [];
  }, [sectors]);

  const mainAchievements = useMemo(() => {
    return achievements?.filter(a => mainSectorIds.includes(a.sector_id)) || [];
  }, [achievements, mainSectorIds]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !goals || !actions || !sectors || !achievements) {
    return (
      <Card className="p-6 text-destructive flex items-center justify-center min-h-[400px]">
        <XCircle className="h-5 w-5 mr-2" />
        Erro ao carregar dados do dashboard. Tente novamente mais tarde.
      </Card>
    );
  }

  const organicSectorId = sectors.find(s => s.name.toUpperCase() === 'ORGÂNICO')?.id;

  const sectorPerformance = sectors.map(sector => {
    let sectorTarget = 0;
    let sectorAchieved = 0;

    if (sector.id === organicSectorId) {
      sectorAchieved = achievements
        .filter(a => a.sector_id === organicSectorId)
        .reduce((sum, a) => sum + a.achieved_quantity, 0);
      sectorTarget = 0; // Orgânico não tem meta
    } else {
      const sectorGoals = goals.filter(g => g.sector_id === sector.id);
      sectorTarget = sectorGoals.reduce((sum, g) => sum + g.target_quantity, 0);
      sectorAchieved = sectorGoals.reduce((sum, g) => sum + g.achieved_quantity, 0);
    }
    
    return {
      id: sector.id,
      name: sector.name,
      goal: sectorTarget,
      achieved: sectorAchieved,
      status: calculateSectorStatus(sectorAchieved, sectorTarget),
      icon: getSectorIcon(sector.name),
      colors: getSectorColors(sector.name),
    };
  }).filter(p => p.goal > 0 || p.achieved > 0);

  const includedPerformance = sectorPerformance.filter(p => !EXCLUDED_SECTORS.includes(p.name.toUpperCase()));
  
  // Para exibição de cards, excluímos o orgânico pois ele não tem meta
  const performanceForCards = includedPerformance.filter(p => p.id !== organicSectorId);

  // Para o gráfico, incluímos o orgânico, ordenamos e preparamos os dados para a linha de meta
  const performanceForChart = [...includedPerformance]
    .sort((a, b) => {
      if (a.name.toUpperCase() === 'ORGÂNICO') return 1;
      if (b.name.toUpperCase() === 'ORGÂNICO') return -1;
      return a.name.localeCompare(b.name);
    })
    .map(item => ({
      ...item,
      // Define a meta como nula para o Orgânico para que a linha não seja desenhada para ele
      goal: item.name.toUpperCase() === 'ORGÂNICO' ? null : item.goal,
    }));

  // Meta total é a soma das metas dos setores de captação (sem orgânico)
  const totalTarget = performanceForCards.reduce((sum, p) => sum + p.goal, 0);
  
  // Realizado total é a soma de todos os setores de captação (incluindo orgânico)
  const totalAchieved = includedPerformance.reduce((sum, p) => sum + p.achieved, 0);
  
  const totalOrganics = sectorPerformance.find(p => p.id === organicSectorId)?.achieved || 0;
  
  const completionPercentage = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;
  const activeActions = actions.filter(a => a.status === 'planning' || a.status === 'partial' || a.status === 'delayed').length;
  const totalActions = actions.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row items-center gap-8">
        <div className="space-y-2 w-full lg:w-auto">
          <h1 className="text-3xl font-bold text-foreground">Dashboard Executivo</h1>
          <p className="text-muted-foreground">Visão geral do desempenho dos setores.</p>
        </div>
        <div className="w-full flex-1">
          <TotalProgressTracker achieved={totalAchieved} total={totalTarget} />
        </div>
      </div>

      <div className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Meta Total" value={totalTarget.toLocaleString()} subtitle="Objetivo geral de captação" icon={Target} variant="default" />
          <MetricCard title="Realizado" value={totalAchieved.toLocaleString()} subtitle={`${completionPercentage}% da meta`} icon={CheckCircle} variant={completionPercentage >= 100 ? "success" : "warning"} />
          <MetricCard title="Orgânicos" value={totalOrganics.toLocaleString()} subtitle="Captações espontâneas" icon={Leaf} variant="success" />
          <MetricCard title="Ações Ativas" value={activeActions.toLocaleString()} subtitle={`${totalActions} ações totais`} icon={TrendingUp} variant="warning" />
        </div>
        
        <div>
          <h2 className="mb-4 text-xl font-semibold text-foreground">Desempenho por Setor</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {performanceForCards.length === 0 ? (
              <p className="text-muted-foreground col-span-4">Nenhuma meta cadastrada para os setores.</p>
            ) : (
              performanceForCards.map((sector) => (
                <SectorCard 
                  key={sector.id} 
                  title={sector.name} 
                  icon={sector.icon} 
                  goal={sector.goal} 
                  achieved={sector.achieved} 
                  status={sector.status}
                  colors={sector.colors.card}
                />
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <SectorPerformanceChart data={performanceForChart} />
          <DailyTrendChart achievements={mainAchievements} />
        </div>
        
        <DailyTimeline />
      </div>
    </div>
  );
};