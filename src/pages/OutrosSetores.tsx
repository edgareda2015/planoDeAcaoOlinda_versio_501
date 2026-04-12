import { Loader2, XCircle, ClipboardList } from "lucide-react";
import { SectorCard } from "@/components/SectorCard";
import { useGoals, useSectors } from "@/hooks/useGoals";
import { useDailyAchievements } from "@/hooks/useDailyAchievements";
import { Card } from "@/components/ui/card";
import { getSectorIcon, getSectorColors } from "@/lib/sector-config";
import { MonthlyReport } from "@/components/MonthlyReport";
import { Separator } from "@/components/ui/separator";

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

// Setores que devem aparecer neste dashboard de apoio
const SUPPORT_SECTORS = ['REMATRÍCULA', 'EAD', 'EAD/PÓS', 'PÓS', 'CRA', 'CRA/RETENÇÃO'];

const OutrosSetores = () => {
  const { data: goals, isLoading: isLoadingGoals, isError: isErrorGoals } = useGoals();
  const { data: sectors, isLoading: isLoadingSectors } = useSectors();
  const { data: achievements, isLoading: isLoadingAchievements, isError: isErrorAchievements } = useDailyAchievements();

  const isLoading = isLoadingGoals || isLoadingSectors || isLoadingAchievements;
  const isError = isErrorGoals || isErrorAchievements;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !goals || !sectors || !achievements) {
    return (
      <Card className="p-6 text-destructive flex items-center justify-center min-h-[400px]">
        <XCircle className="h-5 w-5 mr-2" />
        Erro ao carregar dados. Tente novamente mais tarde.
      </Card>
    );
  }

  const sectorPerformance = sectors.map(sector => {
    const sectorGoals = goals.filter(g => g.sector_id === sector.id);
    const sectorTarget = sectorGoals.reduce((sum, g) => sum + g.target_quantity, 0);
    const sectorAchieved = sectorGoals.reduce((sum, g) => sum + g.achieved_quantity, 0);
    
    return {
      id: sector.id,
      name: sector.name,
      goal: sectorTarget,
      achieved: sectorAchieved,
      status: calculateSectorStatus(sectorAchieved, sectorTarget),
      icon: getSectorIcon(sector.name),
      colors: getSectorColors(sector.name),
    };
  }).filter(p => SUPPORT_SECTORS.includes(p.name.toUpperCase()) && (p.goal > 0 || p.achieved > 0));

  // Filter sectors for the monthly report
  const reportSectors = sectors.filter(s => SUPPORT_SECTORS.includes(s.name.toUpperCase()));

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Dashboard de Apoio</h1>
        <p className="text-muted-foreground">Visão geral do desempenho dos setores de suporte e retenção.</p>
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold text-foreground">Desempenho por Setor</h2>
        {sectorPerformance.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Nenhuma meta ou resultado encontrado para os setores de apoio.</p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {sectorPerformance.map((sector) => (
              <SectorCard 
                key={sector.id} 
                title={sector.name} 
                icon={sector.icon} 
                goal={sector.goal} 
                achieved={sector.achieved} 
                status={sector.status}
                colors={sector.colors.card}
              />
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div>
        <h2 className="mb-4 text-xl font-semibold text-foreground">Relatório Mês a Mês</h2>
        <MonthlyReport 
          goals={goals} 
          sectors={reportSectors} 
          achievements={achievements} 
          showConsolidated={false} 
        />
      </div>
    </div>
  );
};

export default OutrosSetores;