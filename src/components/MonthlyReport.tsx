import { Goal, Sector } from "@/hooks/useGoals";
import { DailyAchievement } from "@/hooks/useDailyAchievements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getSectorColors } from "@/lib/sector-config";

interface ReportTableProps {
  title: string;
  data: Record<string, { target: number; achieved: number }>;
  totalTarget: number;
  totalAchieved: number;
  headerColors: { bg: string; hover: string };
}

const ReportTable = ({ title, data, totalTarget, totalAchieved, headerColors }: ReportTableProps) => {
  const sortedMonths = Object.keys(data).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return (
    <Card>
      <CardHeader className={cn("text-primary-foreground", headerColors.bg)}>
        <CardTitle className="text-base font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className={cn(headerColors.bg, "[&_th]:text-primary-foreground", headerColors.hover)}>
                <TableHead className="p-2 md:p-4">Mês</TableHead>
                <TableHead className="text-right p-2 md:p-4">Previsto</TableHead>
                <TableHead className="text-right p-2 md:p-4">Realizado</TableHead>
                <TableHead className="text-right p-2 md:p-4">Diferença</TableHead>
                <TableHead className="w-[100px] md:w-[120px] text-center p-2 md:p-4">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMonths.map((month) => {
                const { target, achieved } = data[month];
                const difference = achieved - target;
                const percentage = target > 0 ? (achieved / target) * 100 : 0;
                const displayDate = new Date(month.replace(/-/g, '/'));
                return (
                  <TableRow key={month}>
                    <TableCell className="font-medium capitalize p-2 md:p-4 text-sm md:text-base">{format(displayDate, "MMMM", { locale: ptBR })}</TableCell>
                    <TableCell className="text-right p-2 md:p-4 text-sm md:text-base">{target}</TableCell>
                    <TableCell className="text-right p-2 md:p-4 text-sm md:text-base">{achieved}</TableCell>
                    <TableCell className={cn("text-right font-semibold p-2 md:p-4 text-sm md:text-base", difference < 0 ? "text-destructive" : "text-accent")}>{difference}</TableCell>
                    <TableCell className="p-1 md:p-2">
                      <div className="relative overflow-hidden rounded-md bg-secondary p-2 text-center">
                        <div
                          className="absolute left-0 top-0 h-full bg-accent/30"
                          style={{ width: `${percentage}%` }}
                        ></div>
                        <span className="relative font-medium text-foreground text-xs md:text-sm">{percentage.toFixed(2)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell className="p-2 md:p-4 text-sm md:text-base">TOTAL</TableCell>
                <TableCell className="text-right p-2 md:p-4 text-sm md:text-base">{totalTarget}</TableCell>
                <TableCell className="text-right p-2 md:p-4 text-sm md:text-base">{totalAchieved}</TableCell>
                <TableCell className={cn("text-right p-2 md:p-4 text-sm md:text-base", (totalAchieved - totalTarget) < 0 ? "text-destructive" : "text-accent")}>{totalAchieved - totalTarget}</TableCell>
                <TableCell className="text-center font-bold p-2 md:p-4 text-sm md:text-base">
                  {totalTarget > 0 ? ((totalAchieved / totalTarget) * 100).toFixed(2) : 0}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

interface MonthlyReportProps {
  goals: Goal[];
  sectors: Sector[];
  achievements: DailyAchievement[];
  showConsolidated?: boolean;
}

export const MonthlyReport = ({ goals, sectors, achievements, showConsolidated = true }: MonthlyReportProps) => {
  const monthlyGoals = goals.filter(g => g.period_type === 'monthly');
  const organicSectorId = sectors.find(s => s.name.toUpperCase() === 'ORGÂNICO')?.id;

  // 1. Calculate consolidated data for "TOTAL" table
  const consolidatedData = monthlyGoals.reduce((acc, goal) => {
    const localDate = new Date(goal.period_start_date.replace(/-/g, '/'));
    const monthKey = format(localDate, "yyyy-MM-01");
    if (!acc[monthKey]) acc[monthKey] = { target: 0, achieved: 0 };
    acc[monthKey].target += goal.target_quantity;
    acc[monthKey].achieved += goal.achieved_quantity;
    return acc;
  }, {} as Omit<ReportTableProps, "title" | "headerColors">["data"]);

  // Add organic achievements to the consolidated total
  achievements.forEach(ach => {
    if (ach.sector_id === organicSectorId) {
      const localDate = new Date(ach.date.replace(/-/g, '/'));
      const monthKey = format(localDate, "yyyy-MM-01");
      if (!consolidatedData[monthKey]) consolidatedData[monthKey] = { target: 0, achieved: 0 };
      consolidatedData[monthKey].achieved += ach.achieved_quantity;
    }
  });

  const consolidatedTotalTarget = monthlyGoals.reduce((sum, g) => sum + g.target_quantity, 0);
  const organicTotal = achievements
    .filter(a => a.sector_id === organicSectorId)
    .reduce((sum, a) => sum + a.achieved_quantity, 0);
  const consolidatedTotalAchieved = monthlyGoals.reduce((sum, g) => sum + g.achieved_quantity, 0) + organicTotal;

  // 2. Calculate data for individual sectors
  const dataBySector = sectors.map(sector => {
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
      totalTarget = 0; // Organic has no target
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

    return { 
      name: sector.name, 
      data, 
      totalTarget, 
      totalAchieved,
      colors: getSectorColors(sector.name)
    };
  }).filter(s => s.totalTarget > 0 || s.totalAchieved > 0);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {showConsolidated && consolidatedTotalTarget > 0 && (
        <ReportTable
          title="TOTAL CONSOLIDADO"
          data={consolidatedData}
          totalTarget={consolidatedTotalTarget}
          totalAchieved={consolidatedTotalAchieved}
          headerColors={{ bg: "bg-primary", hover: "hover:bg-primary/90" }}
        />
      )}
      {dataBySector.map(sectorData => (
        <ReportTable 
          key={sectorData.name} 
          title={sectorData.name} 
          data={sectorData.data}
          totalTarget={sectorData.totalTarget}
          totalAchieved={sectorData.totalAchieved}
          headerColors={sectorData.colors.header}
        />
      ))}
    </div>
  );
};