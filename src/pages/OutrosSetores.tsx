import { useMemo } from "react";
import { Loader2, Trophy, AlertTriangle, PlayCircle, BarChart3, TrendingUp, CheckCircle2, Users } from "lucide-react";
import { useUnits } from "@/hooks/useOrganization";
import { useAllActions } from "@/hooks/useActions";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const RegionalDashboard = () => {
  const { profile } = useAuth();
  const { data: units, isLoading: isLoadingUnits } = useUnits();
  const { data: allActions, isLoading: isLoadingActions } = useAllActions();

  const isLoading = isLoadingUnits || isLoadingActions;

  const stats = useMemo(() => {
    if (!units || !allActions) return null;

    // Filtrar unidades pela regional se o usuário for diretor regional
    const filteredUnits = profile?.role === 'diretor_regional' 
      ? units.filter(u => u.regional_id === profile.regional_id)
      : units;

    const unitStats = filteredUnits.map(unit => {
      const actions = allActions.filter(a => a.unit_id === unit.id);
      const completed = actions.filter(a => a.status === 'completed').length;
      const totalConversions = actions.reduce((sum, a) => sum + (a.completed_enrollment || 0), 0);
      const expectedConversions = actions.reduce((sum, a) => sum + (a.expected_enrollment || 0), 0);
      
      return {
        ...unit,
        totalActions: actions.length,
        completedActions: completed,
        totalConversions,
        expectedConversions,
        completionRate: actions.length > 0 ? (completed / actions.length) * 100 : 0,
        conversionRate: expectedConversions > 0 ? (totalConversions / expectedConversions) * 100 : 0,
      };
    });

    const rankingConversions = [...unitStats].sort((a, b) => b.totalConversions - a.totalConversions);
    const rankingCompletion = [...unitStats].sort((a, b) => b.completionRate - a.completionRate);
    const leastActions = [...unitStats].filter(u => u.totalActions > 0).sort((a, b) => a.totalActions - b.totalActions);
    const notStarted = unitStats.filter(u => u.totalActions === 0);

    return {
      unitStats,
      rankingConversions,
      rankingCompletion,
      leastActions,
      notStarted,
      totals: {
        actions: allActions.length,
        conversions: allActions.reduce((sum, a) => sum + (a.completed_enrollment || 0), 0),
        unitsCount: filteredUnits.length,
      }
    };
  }, [units, allActions, profile]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-foreground tracking-tight uppercase">
            Dashboard de Ações
          </h1>
          <p className="text-muted-foreground">
            {profile?.role === 'admin' ? "Visão consolidada de todas as unidades da rede." : "Visão consolidada das unidades sob sua gestão."}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="outline" className="px-4 py-1.5 border-primary/20 bg-primary/5 text-primary font-bold">
            <Users className="w-4 h-4 mr-2" />
            {stats.totals.unitsCount} Unidades
          </Badge>
          <Badge variant="outline" className="px-4 py-1.5 border-warning/20 bg-warning/5 text-warning-foreground font-bold">
            <BarChart3 className="w-4 h-4 mr-2" />
            {stats.totals.actions} Ações
          </Badge>
        </div>
      </div>

      {/* Grid de Rankings Principais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Top Conversões */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white overflow-hidden relative group">
          <Trophy className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform duration-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-200" />
              Ranking de Conversões
            </CardTitle>
            <CardDescription className="text-indigo-100/70">Unidades com maior número de matrículas concluídas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {stats.rankingConversions.slice(0, 5).map((unit, index) => (
              <div key={unit.id} className="flex items-center justify-between group/item">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black",
                    index === 0 ? "bg-yellow-400 text-yellow-950" : "bg-white/20 text-white"
                  )}>
                    {index + 1}º
                  </span>
                  <span className="text-sm font-bold truncate max-w-[150px]">{unit.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black">{unit.totalConversions}</div>
                  <div className="text-[10px] text-white/60">matrículas</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Conclusão */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white overflow-hidden relative group">
          <CheckCircle2 className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform duration-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-200" />
              Eficiência de Execução
            </CardTitle>
            <CardDescription className="text-emerald-100/70">Unidades com maior % de ações concluídas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {stats.rankingCompletion.slice(0, 5).map((unit, index) => (
              <div key={unit.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold truncate">{unit.name}</span>
                  <span className="text-sm font-black">{Math.round(unit.completionRate)}%</span>
                </div>
                <Progress value={unit.completionRate} className="h-1.5 bg-white/20" indicatorClassName="bg-white" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Alerta de Baixo Engajamento */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-orange-500 to-orange-700 text-white overflow-hidden relative group">
          <AlertTriangle className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform duration-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-200" />
              Menor Engajamento
            </CardTitle>
            <CardDescription className="text-orange-100/70">Unidades com poucas ações cadastradas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {stats.leastActions.slice(0, 5).map((unit, index) => (
              <div key={unit.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">{unit.name}</span>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-none font-black">
                  {unit.totalActions} ações
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Alerta Crítico: Não Iniciaram */}
      {stats.notStarted.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5 overflow-hidden">
          <CardHeader className="bg-destructive/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive text-destructive-foreground rounded-lg">
                <PlayCircle className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-destructive">Atenção: Unidades Sem Cadastro</CardTitle>
                <CardDescription className="text-destructive/70">Estas unidades ainda não cadastraram nenhuma ação no semestre vigente.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
              {stats.notStarted.map(unit => (
                <div key={unit.id} className="flex items-center p-3 rounded-lg border border-destructive/20 bg-white shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-destructive animate-pulse mr-3" />
                  <span className="text-sm font-bold text-foreground truncate">{unit.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela Detalhada (Visão Completa) */}
      <Card className="border-none shadow-2xl overflow-hidden">
        <CardHeader className="border-b bg-secondary/30">
          <CardTitle className="text-xl font-black uppercase tracking-tight">Visão Geral Detalhada</CardTitle>
          <CardDescription>Dados consolidados de todas as unidades monitoradas.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b">
                  <th className="px-6 py-4">Unidade</th>
                  <th className="px-6 py-4 text-center">Total Ações</th>
                  <th className="px-6 py-4 text-center">Concluídas</th>
                  <th className="px-6 py-4 text-center">Eficiência</th>
                  <th className="px-6 py-4 text-center">Conversões</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.unitStats.sort((a,b) => b.totalConversions - a.totalConversions).map(unit => (
                  <tr key={unit.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm text-foreground">{unit.name}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{unit.regionals?.name || 'Regional'}</div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-sm">{unit.totalActions}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        {unit.completedActions}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-black">{Math.round(unit.completionRate)}%</span>
                        <Progress value={unit.completionRate} className="w-20 h-1" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-black text-indigo-600">{unit.totalConversions}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {unit.totalActions === 0 ? (
                        <Badge variant="destructive" className="animate-pulse">CRÍTICO</Badge>
                      ) : unit.completionRate > 70 ? (
                        <Badge className="bg-emerald-500 text-white">EXCELENTE</Badge>
                      ) : unit.completionRate > 40 ? (
                        <Badge className="bg-warning text-warning-foreground">REGULAR</Badge>
                      ) : (
                        <Badge variant="secondary">EM ATENÇÃO</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegionalDashboard;