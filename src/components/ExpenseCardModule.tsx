import { useState, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PlusCircle, FileDown, Search, Filter, X, Loader2, Trash2, Pencil,
  Eye, Download, MoreHorizontal, CreditCard, TrendingDown, Wallet,
  Receipt, Building2, Phone, Paperclip, AlertTriangle, ChevronLeft, ChevronRight,
  BarChart3, List, Coins,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, formatCurrency } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import {
  useExpenses,
  useExpenseSectors,
  useExpenseStatuses,
  useDeleteExpense,
  Expense,
} from "@/hooks/useExpenses";
import { ExpenseModal } from "@/components/ExpenseModal";
import { ExpenseSectorManager } from "@/components/ExpenseSectorManager";
import { exportExpensesToExcel } from "@/lib/exportUtils";

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  "Aberto": "#3b82f6",
  "Em Análise": "#f59e0b",
  "Aprovado": "#8b5cf6",
  "Comprado": "#06b6d4",
  "Pago": "#22c55e",
  "Cancelado": "#ef4444",
};

const getStatusBadgeClass = (status: string) => {
  const map: Record<string, string> = {
    "Aberto":      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    "Em Análise":  "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    "Aprovado":    "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
    "Comprado":    "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
    "Pago":        "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    "Cancelado":   "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  };
  return map[status] ?? "bg-gray-100 text-gray-800";
};

const getBudgetAlertColor = (pct: number) => {
  if (pct > 90) return { bar: "#ef4444", text: "text-red-600", bg: "bg-red-500/10", label: "Crítico" };
  if (pct > 70) return { bar: "#f59e0b", text: "text-amber-600", bg: "bg-amber-500/10", label: "Atenção" };
  return { bar: "#22c55e", text: "text-green-600", bg: "bg-green-500/10", label: "Normal" };
};

const SECTOR_PALETTE = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"];

const ITEMS_PER_PAGE = 10;

// ─── KPI Card ───────────────────────────────────────────────────────────────

const KpiCard = ({
  title, value, icon: Icon, colorClass, sub,
}: {
  title: string; value: string; icon: any; colorClass: string; sub?: string;
}) => (
  <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shadow-inner shrink-0", colorClass)}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate" title={title}>{title}</p>
        <p className="text-base sm:text-lg font-extrabold text-foreground leading-tight mt-0.5 whitespace-nowrap">
          {value}
        </p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
      </div>
    </CardContent>
  </Card>
);

// ─── Attachment Preview Modal ────────────────────────────────────────────────

const AttachmentPreviewModal = ({
  attachment,
  onClose,
}: {
  attachment: { file_name: string; file_path: string; file_type: string } | null;
  onClose: () => void;
}) => {
  if (!attachment) return null;
  const isImage = ["jpg", "jpeg", "png"].includes(attachment.file_type.toLowerCase());
  const { data: { publicUrl } } = supabase.storage.from("evidences").getPublicUrl(attachment.file_path);

  return (
    <Dialog open={!!attachment} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 truncate">
            <Paperclip className="h-4 w-4 text-primary shrink-0" />
            {attachment.file_name}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto rounded-lg border bg-muted/20 flex items-center justify-center p-4 min-h-[300px]">
          {isImage ? (
            <img
              src={publicUrl}
              alt={attachment.file_name}
              className="max-w-full max-h-[60vh] object-contain rounded shadow-lg"
            />
          ) : (
            <iframe
              src={publicUrl}
              title={attachment.file_name}
              className="w-full h-[60vh] rounded"
            />
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button asChild className="bg-primary hover:bg-primary/90">
            <a href={publicUrl} download={attachment.file_name} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4 mr-2" />
              Baixar
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Dashboard Sub-Component ─────────────────────────────────────────────────

const ExpenseDashboard = ({
  expenses,
  sectors,
}: {
  expenses: Expense[];
  sectors: any[];
}) => {
  // KPIs
  const totalBudget    = sectors.reduce((s, sec) => s + sec.budget_received, 0);
  const totalSpent     = sectors.reduce((s, sec) => s + sec.spent_amount, 0);
  const currentBalance = totalBudget - totalSpent;
  const totalExpenses  = expenses.length;
  const totalSectors   = sectors.length;
  const uniqueTickets  = new Set(expenses.map(e => e.ticket_number).filter(Boolean)).size;
  const totalAttachments = expenses.reduce((s, e) => s + (e.expense_attachments?.length ?? 0), 0);

  // KPIs do Período Atual (independente de acúmulo)
  const periodBudget   = sectors.reduce((s, sec) => s + sec.period_budget_received, 0);
  const periodSpent    = sectors.reduce((s, sec) => s + sec.period_spent_amount, 0);
  const periodBalance  = periodBudget - periodSpent;

  // Chart: Gastos por Setor (Bar)
  const spentBySector = sectors.map((sec, i) => ({
    name: sec.name.length > 12 ? sec.name.slice(0, 12) + "…" : sec.name,
    fullName: sec.name,
    value: sec.spent_amount,
    fill: SECTOR_PALETTE[i % SECTOR_PALETTE.length],
  }));

  // Chart: Saldo por Setor (Bar)
  const balanceBySector = sectors.map((sec, i) => ({
    name: sec.name.length > 12 ? sec.name.slice(0, 12) + "…" : sec.name,
    fullName: sec.name,
    saldo: sec.remaining_budget,
    fill: sec.remaining_budget >= 0 ? "#22c55e" : "#ef4444",
  }));

  // Chart: % Utilização Verba por Setor
  const utilizationData = sectors.map(sec => {
    const pct = sec.budget_received > 0 ? Math.min(100, (sec.spent_amount / sec.budget_received) * 100) : 0;
    return { name: sec.name, pct: parseFloat(pct.toFixed(1)), budget_received: sec.budget_received };
  }).sort((a, b) => b.pct - a.pct);

  // Chart: Gastos por Mês (Line)
  const monthlySpend: Record<string, number> = {};
  expenses.forEach(e => {
    const key = format(parseISO(e.purchase_date), "MM/yyyy");
    monthlySpend[key] = (monthlySpend[key] || 0) + Number(e.value);
  });
  const monthlyData = Object.entries(monthlySpend)
    .sort((a, b) => {
      const [ma, ya] = a[0].split("/");
      const [mb, yb] = b[0].split("/");
      return new Date(+ya, +ma - 1).getTime() - new Date(+yb, +mb - 1).getTime();
    })
    .map(([month, value]) => ({ month, value }));

  // Chart: Gastos por Status (Pie)
  const statusSpend: Record<string, number> = {};
  expenses.forEach(e => {
    statusSpend[e.status] = (statusSpend[e.status] || 0) + Number(e.value);
  });
  const statusPieData = Object.entries(statusSpend).map(([name, value]) => ({ name, value }));

  // Chart: Top 10 Maiores Despesas consolidadas (agrupa por descrição e soma)
  const top10 = Object.entries(
    expenses.reduce((acc, e) => {
      const key = e.description.trim();
      acc[key] = (acc[key] || 0) + Number(e.value);
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([description, total]) => ({
      name: description.length > 20 ? description.slice(0, 20) + "…" : description,
      fullName: description,
      value: total,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Chart: Evolução Mensal (Area)
  const evolutionData = monthlyData;

  // Chart: Setores com Maior Consumo (Bar)
  const consumptionData = [...spentBySector].sort((a, b) => b.value - a.value);

  const CustomTooltipCurrency = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="rounded-lg border bg-card p-3 shadow-xl text-sm">
          <p className="font-bold text-foreground mb-1">{payload[0].payload.fullName || label}</p>
          <p className="text-muted-foreground">Valor: <span className="font-semibold text-foreground">{formatCurrency(payload[0].value)}</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards — 4 cards principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard 
          title="Verba Recebida" 
          value={formatCurrency(totalBudget)} 
          icon={Wallet} 
          colorClass="bg-blue-500" 
          sub={`Período: ${formatCurrency(periodBudget)}`}
        />
        <KpiCard 
          title="Total Gasto" 
          value={formatCurrency(totalSpent)} 
          icon={TrendingDown} 
          colorClass="bg-red-500" 
          sub={`Período: ${formatCurrency(periodSpent)}`}
        />
        <KpiCard 
          title="Saldo Atual" 
          value={formatCurrency(currentBalance)} 
          icon={CreditCard} 
          colorClass="bg-emerald-500" 
          sub={`Período: ${formatCurrency(periodBalance)}`}
        />
        <KpiCard 
          title="Lançamentos" 
          value={String(totalExpenses)} 
          icon={Receipt} 
          colorClass="bg-violet-500" 
          sub="No período ativo"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Principal – Resumo Financeiro por Setor */}
        <Card className="md:col-span-2 border-2 border-emerald-500/30 dark:border-emerald-500/50 shadow-lg relative overflow-hidden bg-card/65 backdrop-blur-sm transition-all hover:border-emerald-500/40">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-extrabold flex items-center gap-2 text-slate-900 dark:text-slate-50">
                <BarChart3 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                Demonstrativo de Verba, Gasto e Saldo por Setor
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Visão unificada das verbas alocadas, total de despesas pagas/em análise e saldos remanescentes de cada setor.
              </CardDescription>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/20 text-xs font-semibold px-2.5 py-1">
              Principal
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-y-auto max-h-[300px] custom-scrollbar pr-1">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/80 bg-slate-50/50 dark:bg-slate-900/50">
                    <TableHead className="py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Setor</TableHead>
                    <TableHead className="py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-right">Verba Recebida</TableHead>
                    <TableHead className="py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-right">Gastos</TableHead>
                    <TableHead className="py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-right">Saldo Atual</TableHead>
                    <TableHead className="py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 w-[180px]">Uso da Verba</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">Sem dados disponíveis</TableCell>
                    </TableRow>
                  ) : (
                    sectors.map((sec, i) => {
                      const pct = sec.budget_received > 0 ? Math.min(100, (sec.spent_amount / sec.budget_received) * 100) : 0;
                      const alert = getBudgetAlertColor(pct);
                      const isNegative = sec.remaining_budget < 0;
                      
                      return (
                        <TableRow key={sec.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-900/60 border-b border-border/50 transition-colors">
                          <TableCell className="py-3 font-extrabold text-slate-950 dark:text-slate-50 text-sm tracking-tight">
                            <div>{sec.name}</div>
                            <div className="mt-1">
                              <Badge variant="secondary" className="text-[10px] font-normal px-1 py-0 bg-secondary/50">
                                {sec.accumulates_balance ? "Acumula Saldo" : "Não Acumula"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-right font-semibold text-slate-700 dark:text-slate-300 text-sm whitespace-nowrap">
                            <div>{formatCurrency(sec.budget_received)}</div>
                            <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                              Período: {formatCurrency(sec.period_budget_received)}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-right font-bold text-red-600 dark:text-red-400 text-sm whitespace-nowrap">
                            <div>{formatCurrency(sec.spent_amount)}</div>
                            <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                              Período: {formatCurrency(sec.period_spent_amount)}
                            </div>
                          </TableCell>
                          <TableCell className={cn(
                            "py-3 text-right font-black text-sm whitespace-nowrap",
                            isNegative ? "text-red-600 dark:text-red-500" : "text-emerald-600 dark:text-emerald-400"
                          )}>
                            <div>{formatCurrency(sec.remaining_budget)}</div>
                            <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                              Período: {formatCurrency(sec.period_remaining_budget)}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-bold">
                                <span className={cn(alert.text)}>{pct.toFixed(1)}%</span>
                                <Badge variant="outline" className={cn("text-[9px] py-0 px-1 font-semibold border-none shadow-none", alert.bg, alert.text)}>
                                  {alert.label}
                                </Badge>
                              </div>
                              <Progress
                                value={pct}
                                className="h-1.5"
                                style={{ "--progress-foreground": alert.bar } as any}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 3 – Gastos por Status (Pie) */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Gastos por Status</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {statusPieData.length === 0 ? (
              <p className="text-muted-foreground text-sm py-10">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {statusPieData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] ?? SECTOR_PALETTE[i % SECTOR_PALETTE.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 4 – Gastos por Mês (Line) */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Gastos por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <p className="text-muted-foreground text-sm py-10 text-center">Sem dados mensais</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 5 – Top 10 Maiores Despesas (consolidadas por descrição) */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="text-sm font-semibold">Top 10 Maiores Despesas</CardTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">Valores consolidados por descrição</p>
            </div>
          </CardHeader>
          <CardContent>
            {top10.length === 0 ? (
              <p className="text-muted-foreground text-sm py-10 text-center">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, top10.length * 32)}>
                <BarChart data={top10} layout="vertical" margin={{ left: 0, right: 60, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(1)}k`} />
                  <YAxis type="category" dataKey="name" fontSize={9} tickLine={false} axisLine={false} width={100} />
                  <Tooltip
                    formatter={(v: any) => [formatCurrency(v), "Total consolidado"]}
                    labelFormatter={(label: string, payload: any[]) =>
                      payload?.[0]?.payload?.fullName || label
                    }
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                    {top10.map((_, i) => (
                      <Cell key={i} fill={SECTOR_PALETTE[i % SECTOR_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 6 – Evolução Mensal dos Gastos (Area) */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Evolução Mensal dos Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            {evolutionData.length === 0 ? (
              <p className="text-muted-foreground text-sm py-10 text-center">Sem dados mensais</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={evolutionData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#expGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 7 – Setores com Maior Consumo */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Setores com Maior Consumo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={consumptionData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis 
                  type="category" 
                  dataKey="fullName" 
                  fontSize={10} 
                  tick={{ fill: "currentColor", fontWeight: "bold" }} 
                  className="text-slate-900 dark:text-slate-100 font-bold"
                  tickLine={false} 
                  axisLine={false} 
                  width={110} 
                />
                <Tooltip content={<CustomTooltipCurrency />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {consumptionData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 8 – % Utilização da Verba por Setor */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Percentual de Utilização da Verba</CardTitle>
          </CardHeader>
          <CardContent>
            {utilizationData.length === 0 ? (
              <p className="text-muted-foreground text-sm py-10 text-center">Sem setores com verba alocada</p>
            ) : (
              <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                {utilizationData.map((sec) => {
                  const alert = getBudgetAlertColor(sec.pct);
                  return (
                    <div key={sec.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[60%]">{sec.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-xs py-0 px-1.5", alert.bg, alert.text)}>
                            {alert.label}
                          </Badge>
                          <span className={cn("text-xs font-bold", alert.text)}>{sec.pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <Progress
                        value={sec.pct}
                        className="h-2"
                        style={{ "--progress-foreground": alert.bar } as any}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ─── Expenses Table Sub-Component ────────────────────────────────────────────

const getDocStatus = (exp: Expense) => {
  const hasTicket = !!exp.ticket_number;
  const hasAttachment = exp.expense_attachments && exp.expense_attachments.length > 0;
  
  if (hasTicket && hasAttachment) {
    return {
      label: "Completo",
      badgeClass: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
      iconClass: "bg-green-500",
      tooltip: "Chamado e Anexo inseridos"
    };
  } else if (!hasTicket && !hasAttachment) {
    return {
      label: "Pendente",
      badgeClass: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
      iconClass: "bg-red-500",
      tooltip: "Falta Chamado e Anexo"
    };
  } else {
    const missing = !hasTicket ? "Chamado" : "Anexo";
    return {
      label: `Falta ${missing}`,
      badgeClass: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
      iconClass: "bg-amber-500",
      tooltip: `Apenas ${!hasTicket ? "Anexo" : "Chamado"} inserido`
    };
  }
};

const ExpensesTable = ({
  expenses,
  sectors,
  statuses,
  onAdd,
  onEdit,
  onDelete,
  onViewAttachment,
}: {
  expenses: Expense[];
  sectors: any[];
  statuses: string[];
  onAdd: () => void;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
  onViewAttachment: (att: any) => void;
}) => {
  const [search, setSearch]               = useState("");
  const [filterSector, setFilterSector]   = useState("all");
  const [filterStatus, setFilterStatus]   = useState("all");
  const [filterFrom, setFilterFrom]       = useState("");
  const [filterTo, setFilterTo]           = useState("");
  const [filterTicket, setFilterTicket]   = useState("");
  const [filterMinVal, setFilterMinVal]   = useState("");
  const [filterMaxVal, setFilterMaxVal]   = useState("");
  const [showFilters, setShowFilters]     = useState(false);
  const [page, setPage]                   = useState(1);
  const [sortKey, setSortKey]             = useState<keyof Expense>("purchase_date");
  const [sortAsc, setSortAsc]             = useState(false);

  const handleSort = (key: keyof Expense) => {
    if (key === sortKey) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(true); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let result = [...expenses];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.description.toLowerCase().includes(q) ||
        (e.ticket_number || "").toLowerCase().includes(q) ||
        e.expense_sectors?.name?.toLowerCase().includes(q)
      );
    }
    if (filterSector !== "all")  result = result.filter(e => e.sector_id === filterSector);
    if (filterStatus !== "all")  result = result.filter(e => e.status === filterStatus);
    if (filterTicket)            result = result.filter(e => (e.ticket_number || "").includes(filterTicket));
    if (filterFrom)              result = result.filter(e => e.purchase_date >= filterFrom);
    if (filterTo)                result = result.filter(e => e.purchase_date <= filterTo);
    if (filterMinVal)            result = result.filter(e => Number(e.value) >= Number(filterMinVal));
    if (filterMaxVal)            result = result.filter(e => Number(e.value) <= Number(filterMaxVal));

    result.sort((a, b) => {
      const va = (a as any)[sortKey] ?? "";
      const vb = (b as any)[sortKey] ?? "";
      const cmp = typeof va === "number"
        ? va - vb
        : String(va).localeCompare(String(vb));
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [expenses, search, filterSector, filterStatus, filterTicket, filterFrom, filterTo, filterMinVal, filterMaxVal, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageSlice  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const clearFilters = () => {
    setSearch(""); setFilterSector("all"); setFilterStatus("all");
    setFilterFrom(""); setFilterTo(""); setFilterTicket("");
    setFilterMinVal(""); setFilterMaxVal(""); setPage(1);
  };

  const SortTh = ({ label, field }: { label: string; field: keyof Expense }) => (
    <TableHead
      className="cursor-pointer select-none hover:text-primary transition-colors"
      onClick={() => handleSort(field)}
    >
      {label} {sortKey === field ? (sortAsc ? "↑" : "↓") : ""}
    </TableHead>
  );

  const totalFiltered = filtered.reduce((s, e) => s + Number(e.value), 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shrink-0">
          <PlusCircle className="mr-2 h-4 w-4" />
          Lançar Despesa
        </Button>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por descrição, chamado ou setor…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>

        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(p => !p)}
          className={showFilters ? "bg-primary text-white" : ""}
        >
          <Filter className="h-4 w-4 mr-1" />
          Filtros
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => exportExpensesToExcel(filtered)}
          disabled={filtered.length === 0}
        >
          <FileDown className="h-4 w-4 mr-1" />
          Excel
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="border-primary/20 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <Select value={filterSector} onValueChange={v => { setFilterSector(v); setPage(1); }}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Setor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Setores</SelectItem>
                  {sectors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>

              <Input className="text-xs" type="date" placeholder="Data de" value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setPage(1); }} title="De" />
              <Input className="text-xs" type="date" placeholder="Data até" value={filterTo} onChange={e => { setFilterTo(e.target.value); setPage(1); }} title="Até" />
              <Input className="text-xs" placeholder="Nº Chamado" value={filterTicket} onChange={e => { setFilterTicket(e.target.value); setPage(1); }} />
              <Input className="text-xs" type="number" placeholder="Valor mín." value={filterMinVal} onChange={e => { setFilterMinVal(e.target.value); setPage(1); }} />
              <Input className="text-xs" type="number" placeholder="Valor máx." value={filterMaxVal} onChange={e => { setFilterMaxVal(e.target.value); setPage(1); }} />
            </div>
            <Button variant="ghost" size="sm" className="mt-2 text-xs text-muted-foreground" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" />
              Limpar filtros
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>{filtered.length} lançamento(s) encontrado(s)</span>
        <span className="font-semibold text-foreground">Total filtrado: {formatCurrency(totalFiltered)}</span>
      </div>

      {/* Table */}
      <Card className="shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary/5 hover:bg-primary/5">
                <SortTh label="Setor"          field="sector_id" />
                <SortTh label="Data Compra"    field="purchase_date" />
                <SortTh label="Valor"          field="value" />
                <TableHead>Descrição</TableHead>
                <TableHead>Nº Chamado</TableHead>
                <SortTh label="Data Chamado"   field="ticket_date" />
                <TableHead className="text-center">Doc.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Anexos</TableHead>
                <TableHead className="w-[64px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageSlice.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center h-32 text-muted-foreground">
                    Nenhuma despesa encontrada com os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                pageSlice.map(exp => (
                  <TableRow key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                    <TableCell className="font-bold text-slate-900 dark:text-slate-100 text-sm">{exp.expense_sectors?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(parseISO(exp.purchase_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="font-bold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(Number(exp.value))}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm" title={exp.description}>
                      {exp.description}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{exp.ticket_number || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {exp.ticket_date ? format(parseISO(exp.ticket_date), "dd/MM/yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const doc = getDocStatus(exp);
                        return (
                          <span 
                            title={doc.tooltip} 
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold shrink-0 cursor-help",
                              doc.badgeClass
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full", doc.iconClass)} />
                            {doc.label}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", getStatusBadgeClass(exp.status))}>
                        {exp.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {exp.expense_attachments && exp.expense_attachments.length > 0 ? (
                          exp.expense_attachments.map(att => (
                            <button
                              key={att.id}
                              onClick={() => onViewAttachment(att)}
                              className="flex items-center gap-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded px-1.5 py-0.5 transition-colors"
                              title={att.file_name}
                            >
                              <Paperclip className="h-3 w-3" />
                              <span className="max-w-[60px] truncate">{att.file_name}</span>
                            </button>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(exp)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete(exp)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Module Component ───────────────────────────────────────────────────

export const ExpenseCardModule = () => {
  const { data: expenses = [],  isLoading: isLoadingExpenses } = useExpenses();
  const { data: sectors  = [],  isLoading: isLoadingSectors  } = useExpenseSectors();
  const { data: statuses = []                                 } = useExpenseStatuses();

  const defaultStatuses = ["Aberto", "Em Análise", "Aprovado", "Comprado", "Pago", "Cancelado"];
  const availableStatuses = statuses.length > 0 ? statuses : defaultStatuses;

  const [isModalOpen,    setIsModalOpen]    = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteTarget,   setDeleteTarget]   = useState<Expense | null>(null);
  const [previewAtt,     setPreviewAtt]     = useState<any>(null);

  const { mutate: softDelete, isPending: isDeleting } = useDeleteExpense();

  const handleAdd  = useCallback(() => { setEditingExpense(null); setIsModalOpen(true); }, []);
  const handleEdit = useCallback((e: Expense) => { setEditingExpense(e); setIsModalOpen(true); }, []);
  const handleCloseModal = useCallback(() => { setIsModalOpen(false); setEditingExpense(null); }, []);

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      softDelete(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  const isLoading = isLoadingExpenses || isLoadingSectors;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="dashboard">
        <div className="flex items-center gap-4 border-b border-border pb-0">
          <TabsList className="grid grid-cols-3 w-[510px] h-auto p-0 bg-transparent rounded-none">
            <TabsTrigger
              value="dashboard"
              className={cn(
                "flex items-center gap-2 py-2.5 rounded-none border-b-2 border-transparent transition-all",
                "data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-700 data-[state=active]:font-semibold",
                "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-secondary/40"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Painel de Controle
            </TabsTrigger>
            <TabsTrigger
              value="expenses"
              className={cn(
                "flex items-center gap-2 py-2.5 rounded-none border-b-2 border-transparent transition-all",
                "data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-700 data-[state=active]:font-semibold",
                "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-secondary/40"
              )}
            >
              <List className="h-4 w-4" />
              Lançamentos
            </TabsTrigger>
            <TabsTrigger
              value="management"
              className={cn(
                "flex items-center gap-2 py-2.5 rounded-none border-b-2 border-transparent transition-all",
                "data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-700 data-[state=active]:font-semibold",
                "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-secondary/40"
              )}
            >
              <Coins className="h-4 w-4" />
              Gestão de Verbas
            </TabsTrigger>
          </TabsList>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            {/* Dashboard */}
            <TabsContent value="dashboard" className="mt-6">
              <ExpenseDashboard expenses={expenses} sectors={sectors} />
            </TabsContent>

            {/* Tabela de Lançamentos */}
            <TabsContent value="expenses" className="mt-6">
              <ExpensesTable
                expenses={expenses}
                sectors={sectors}
                statuses={availableStatuses}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={(e) => setDeleteTarget(e)}
                onViewAttachment={(att) => setPreviewAtt(att)}
              />
            </TabsContent>

            {/* Gestão de Verbas */}
            <TabsContent value="management" className="mt-6">
              <ExpenseSectorManager />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Modal de Lançamento */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        expense={editingExpense}
      />

      {/* Prévia de Anexo */}
      <AttachmentPreviewModal
        attachment={previewAtt}
        onClose={() => setPreviewAtt(null)}
      />

      {/* Confirmar Exclusão (Soft Delete) */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Excluir Lançamento?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O lançamento <strong>"{deleteTarget?.description}"</strong> será marcado como excluído
              (soft delete) e não aparecerá mais nos relatórios. O registro é mantido para auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
