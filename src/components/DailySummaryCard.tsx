import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DailySummaryCardProps {
  sectorName: string;
  totalMonth: number;
  lastDayValue: number;
  lastDayDate: string;
  color: string;
}

export const DailySummaryCard = ({
  sectorName,
  totalMonth,
  lastDayValue,
  lastDayDate,
  color,
}: DailySummaryCardProps) => {
  return (
    <Card>
      <CardHeader className={cn("p-3 text-primary-foreground", color)}>
        <CardTitle className="text-sm font-bold truncate">{sectorName}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        <div>
          <p className="text-xs text-muted-foreground">Total no Mês</p>
          <p className="text-xl font-bold">{totalMonth}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Último Lançamento</p>
          <p className="text-base font-semibold">
            {lastDayValue}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              ({lastDayDate})
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};