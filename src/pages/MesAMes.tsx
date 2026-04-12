import { useMemo } from "react";
import { Loader2, XCircle, FileDown } from "lucide-react";
import { useGoals, useSectors } from "@/hooks/useGoals";
import { useDailyAchievements } from "@/hooks/useDailyAchievements";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonthlyReport } from "@/components/MonthlyReport";
import { exportMonthlyReportToPdf } from "@/lib/exportUtils";
import { format } from "date-fns";

// Sectors to be excluded from this page and shown on the support dashboard instead
const SUPPORT_SECTORS = ['REMATRÍCULA', 'EAD', 'EAD/PÓS', 'PÓS', 'CRA', 'CRA/RETENÇÃO'];

const MesAMes = () => {
  const { data: goals, isLoading: isLoadingGoals, isError: isErrorGoals } = useGoals();
  const { data: sectors, isLoading: isLoadingSectors, isError: isErrorSectors } = useSectors();
  const { data: achievements, isLoading: isLoadingAchievements, isError: isErrorAchievements } = useDailyAchievements();

  const isLoading = isLoadingGoals || isLoadingSectors || isLoadingAchievements;
  const isError = isErrorGoals || isErrorSectors || isErrorAchievements;

  // Filter out support sectors to only show main acquisition sectors
  const mainSectors = useMemo(() => {
    return sectors?.filter(s => !SUPPORT_SECTORS.includes(s.name.toUpperCase())) || [];
  }, [sectors]);

  const reportData = useMemo(() => {
    if (!goals || !mainSectors || !achievements) return [];

    const monthlyGoals = goals.filter(g => g.period_type === 'monthly' && mainSectors.some(ms => ms.id === g.sector_id));
    const organicSectorId = mainSectors.find(s => s.name.toUpperCase() === 'ORGÂNICO')?.id;

    const consolidatedData = monthlyGoals.reduce((acc, goal) => {
      const localDate = new Date(goal.period_start_date.replace(/-/g, '/'));
      const monthKey = format(localDate, "yyyy-MM-01");
      if (!acc[monthKey]) acc[monthKey] = { target: 0, achieved: 0 };
      acc[monthKey].target += goal.target_quantity;
      acc[monthKey].achieved += goal.achieved_quantity;
      return acc;
    }, {} as Record<string, { target: number; achieved: number }>);

    achievements.forEach(ach => {
      if (ach.sector_id === organicSectorId) {
        const localDate = new Date(ach.date.replace(/-/g, '/'));
        const monthKey = format(localDate, "yyyy-MM-01");
        if (!consolidatedData[monthKey]) consolidatedData[monthKey] = { target: 0, achieved: 0 };
        consolidatedData[monthKey].achieved += ach.achieved_quantity;
      }
    });

    const consolidatedTotalTarget = monthlyGoals.reduce((sum, g) => sum + g.target_quantity, 0);
    const organicTotal = achievements.filter(a => a.sector_id === organicSectorId).reduce((sum, a) => sum + a.achieved_quantity, 0);
    const consolidatedTotalAchieved = monthlyGoals.reduce((sum, g) => sum + g.achieved_quantity, 0) + organicTotal;

    const reports = [];
    if (consolidatedTotalTarget > 0) {
      reports.push({ name: "TOTAL CONSOLIDADO", data: consolidatedData, totalTarget: consolidatedTotalTarget, totalAchieved: consolidatedTotalAchieved });
    }

    mainSectors.forEach(sector => {
      let data: Record<string, { target: number; achieved: number }> = {};
      let totalTarget = 0;
      let totalAchieved = 0;

      if (sector.id === organicSectorId) {
        const sectorAchievements = achievements.filter(ach => ach.sector_id === sector.id);
        data = sectorAchievements.reduce((acc, ach) => {
          const localDate = new Date(ach.date.replace(/-/g, '/'));
          const monthKey = format(localDate, "yyyy-MM-01");
          if (!acc[monthKey]) acc[monthKey] = { target: 0, achieved: 0 };
          acc[monthKey].achieved += ach.achieved_quantity;
          return acc;
        }, {} as Record<string, { target: number; achieved: number }>);
        totalAchieved = sectorAchievements.reduce((sum, ach) => sum + ach.achieved_quantity, 0);
        totalTarget = 0;
      } else {
        const sectorGoals = monthlyGoals.filter(g => g.sector_id === sector.id);
        data = sectorGoals.reduce((acc, goal) => {
          const localDate = new Date(goal.period_start_date.replace(/-/g, '/'));
          const monthKey = format(localDate, "yyyy-MM-01");
          if (!acc[monthKey]) acc[monthKey] = { target: 0, achieved: 0 };
          acc[monthKey].target += goal.target_quantity;
          acc[monthKey].achieved += goal.achieved_quantity;
          return acc;
        }, {} as Record<string, { target: number; achieved: number }>);
        totalTarget = sectorGoals.reduce((sum, g) => sum + g.target_quantity, 0);
        totalAchieved = sectorGoals.reduce((sum, g) => sum + g.achieved_quantity, 0);
      }

      if (totalTarget > 0 || totalAchieved > 0) {
        reports.push({ name: sector.name, data, totalTarget, totalAchieved });
      }
    });

    return reports;
  }, [goals, mainSectors, achievements]);

  const handleExport = () => {
    if (reportData.length > 0) {
      exportMonthlyReportToPdf(reportData);
    }
  };

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Relatório Mês a Mês</h1>
          <p className="text-muted-foreground">
            Acompanhamento consolidado do desempenho mensal dos setores de captação.
          </p>
        </div>
        <Button onClick={handleExport} disabled={isLoading || reportData.length === 0}>
          <FileDown className="mr-2 h-4 w-4" />
          Exportar PDF
        </Button>
      </div>
      <MonthlyReport goals={goals} sectors={mainSectors} achievements={achievements} />
    </div>
  );
};

export default MesAMes;