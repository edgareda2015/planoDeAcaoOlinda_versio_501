import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ChartData {
  name: string;
  goal: number | null; // Permite nulo para setores sem meta, como 'Orgânico'
  achieved: number;
  colors: { chart: string };
}

interface SectorPerformanceChartProps {
  data: ChartData[];
}

// Rótulo customizado para a linha de meta
const GoalLineLabel = (props: any) => {
  const { x, y, value } = props;
  // Não renderiza o rótulo se a meta for nula ou zero
  if (value === null || value === 0) {
    return null;
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={-25} y={-25} width={50} height={20} fill="hsl(var(--destructive))" rx="4" />
      <text x={0} y={-15} textAnchor="middle" fill="hsl(var(--destructive-foreground))" fontSize="12" fontWeight="bold">
        {value}
      </text>
    </g>
  );
};

// Rótulo customizado para o topo de cada barra
const AchievedBarLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (value === 0) {
    return null;
  }

  return (
    <text x={x + width / 2} y={y - 5} fill="hsl(var(--foreground))" textAnchor="middle" fontSize={12}>
      {value}
    </text>
  );
};

export const SectorPerformanceChart = ({ data }: SectorPerformanceChartProps) => {
  // Encontra o valor máximo entre meta e realizado para definir o domínio do eixo Y
  const maxVal = Math.max(...data.map(d => Math.max(d.goal || 0, d.achieved)));
  const yAxisDomain = [0, Math.ceil(maxVal * 1.15)]; // Adiciona 15% de margem para os rótulos

  const tooltipFormatter = (value: number, name: string) => {
    const nameMap: { [key: string]: string } = {
      achieved: "Realizado",
      goal: "Meta",
    };
    return [value, nameMap[name] || name];
  };

  const tooltipLabelFormatter = (label: string) => {
    return <span className="font-bold capitalize">{label}</span>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Metas Gerais de Captação</CardTitle>
        <CardDescription>Comparativo de metas vs. resultados por setor.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 40, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={yAxisDomain}
                width={30}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--secondary))" }}
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                formatter={tooltipFormatter}
                labelFormatter={tooltipLabelFormatter}
              />
              <Bar dataKey="achieved" radius={[8, 8, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.colors.chart} />
                ))}
                <LabelList dataKey="achieved" content={<AchievedBarLabel />} />
              </Bar>
              <Line
                type="monotone"
                dataKey="goal"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 5, fill: 'hsl(var(--destructive))', strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                activeDot={{ r: 7 }}
              >
                <LabelList dataKey="goal" content={<GoalLineLabel />} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};