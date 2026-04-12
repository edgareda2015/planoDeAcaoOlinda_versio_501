import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectorManager } from "@/components/SectorManager";
import { ResponsibleManager } from "@/components/ResponsibleManager";
import { useVersion } from "@/contexts/VersionContext";
import { useAppSettings, useUpdateAppSetting } from "@/hooks/useAppSettings";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarRange, CheckCircle2, ArrowRightLeft, Eye, Save, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Gera semestres dinamicamente de 2026 até 2035
const SEMESTERS = Array.from({ length: 10 }, (_, i) => {
  const year = 2026 + i;
  return [
    { value: `${year}.1`, label: `${year}.1`, year: `${year}`, half: "1º Semestre" },
    { value: `${year}.2`, label: `${year}.2`, year: `${year}`, half: "2º Semestre" },
  ];
}).flat();

const Admin = () => {
  const { activeVersion, setActiveVersion } = useVersion();
  const { data: settings, isLoading: isLoadingSettings } = useAppSettings();
  const updateSetting = useUpdateAppSetting();

  const handleVersionChange = (version: string) => {
    setActiveVersion(version);
    toast.success(`Semestre alterado para ${version}`, {
      description: "Todos os dados do sistema agora refletem o semestre selecionado.",
      icon: <ArrowRightLeft className="h-4 w-4" />,
    });
  };

  const currentDefault = settings?.default_semester || "2026.1";

  const handleSetDefault = () => {
    updateSetting.mutate({ 
      key: 'default_semester', 
      value: activeVersion 
    }, {
      onSuccess: () => {
        toast.success("Configuração Global Atualizada", {
          description: `O semestre ${activeVersion} agora é o padrão para todos os usuários ao abrirem o sistema.`,
          icon: <Save className="h-4 w-4" />,
        });
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Gestão do Sistema</h1>
        <p className="text-muted-foreground">
          Gerencie os dados de base da aplicação, como setores e responsáveis.
        </p>
      </div>

      <Tabs defaultValue="sectors">
        <TabsList className="grid w-full grid-cols-3 md:w-[600px]">
          <TabsTrigger value="sectors">Setores</TabsTrigger>
          <TabsTrigger value="responsibles">Responsáveis</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sectors">
          <SectorManager />
        </TabsContent>
        
        <TabsContent value="responsibles">
          <ResponsibleManager />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* Card principal do semestre ativo */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            <CardHeader className="relative">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
                  <CalendarRange className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-xl">Semestre Letivo Ativo</CardTitle>
                  <CardDescription>Selecione o semestre para visualizar e inserir dados</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-card border border-border shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Semestre atual: <span className="text-primary font-bold text-lg">{activeVersion === 'all' ? 'Todos' : activeVersion}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ao trocar, todo o sistema carregará automaticamente os dados do semestre escolhido.
                  </p>
                </div>
              </div>

              {/* Grid de semestres */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {SEMESTERS.map((semester) => {
                  const isActive = activeVersion === semester.value;
                  return (
                    <button
                      key={semester.value}
                      onClick={() => handleVersionChange(semester.value)}
                      className={cn(
                        "group relative flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all duration-300 cursor-pointer",
                        "hover:shadow-lg hover:scale-[1.03] active:scale-[0.98]",
                        isActive
                          ? "border-primary bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25"
                          : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
                      )}
                    >
                      {isActive && (
                        <div className="absolute -top-2 -right-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 shadow-md">
                            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                          </div>
                        </div>
                      )}
                      <span className={cn(
                        "text-2xl font-bold tracking-tight",
                        isActive ? "text-primary-foreground" : "text-foreground"
                      )}>
                        {semester.label}
                      </span>
                      <span className={cn(
                        "text-[11px] mt-1 font-medium",
                        isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}>
                        {semester.half}
                      </span>
                    </button>
                  );
                })}

                {/* Botão "Ver Tudo" */}
                <button
                  onClick={() => handleVersionChange("all")}
                  className={cn(
                    "group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-all duration-300 cursor-pointer",
                    "hover:shadow-lg hover:scale-[1.03] active:scale-[0.98]",
                    activeVersion === "all"
                      ? "border-amber-500 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25"
                      : "border-border bg-card hover:border-amber-500/50 hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
                  )}
                >
                  {activeVersion === "all" && (
                    <div className="absolute -top-2 -right-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 shadow-md">
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                      </div>
                    </div>
                  )}
                  <Eye className={cn(
                    "h-6 w-6 mb-1",
                    activeVersion === "all" ? "text-white" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-bold",
                    activeVersion === "all" ? "text-white" : "text-foreground"
                  )}>
                    Ver Tudo
                  </span>
                </button>
              </div>
            </CardContent>

            <CardFooter className="bg-muted/30 border-t border-border mt-6 p-6">
              <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400">
                    <Settings2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Configuração Global</p>
                    {isLoadingSettings ? (
                      <Skeleton className="h-4 w-32 mt-1" />
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        O padrão atual do sistema é: <span className="font-bold text-foreground">{currentDefault}</span>
                      </p>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={handleSetDefault}
                  disabled={updateSetting.isPending || activeVersion === 'all' || activeVersion === currentDefault}
                  variant="outline"
                  className={cn(
                    "w-full md:w-auto gap-2 border-primary/50 text-primary hover:bg-primary hover:text-white transition-all",
                    activeVersion === currentDefault && "opacity-50 grayscale cursor-not-allowed"
                  )}
                >
                  <Save className="h-4 w-4" />
                  Definir {activeVersion} como Padrão Global
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;