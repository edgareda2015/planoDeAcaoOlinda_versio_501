import { ExpenseCardModule } from "@/components/ExpenseCardModule";
import { useHasExpenseAccess } from "@/hooks/useExpenseAccess";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Despesas = () => {
  const { data: hasAccess, isLoading } = useHasExpenseAccess();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full border-red-200/60 bg-gradient-to-br from-red-50/80 to-orange-50/50 dark:from-red-950/20 dark:to-orange-950/10 dark:border-red-900/40 shadow-xl">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center px-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/20 mb-6">
              <Lock className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Acesso Restrito
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              O Cartão de Despesas contém dados financeiros sensíveis. 
              Você não possui permissão para acessar esta área.
              <br /><br />
              Solicite acesso ao administrador do sistema.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white text-sm font-bold shadow">R$</span>
          Cartão de Despesa
        </h1>
        <p className="text-muted-foreground">
          Controle e rastreamento completo de despesas por setor, com verba alocada e notas fiscais.
        </p>
      </div>
      <ExpenseCardModule />
    </div>
  );
};

export default Despesas;
