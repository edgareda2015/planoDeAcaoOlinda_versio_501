import { ExpenseCardModule } from "@/components/ExpenseCardModule";
import { useHasExpenseAccess } from "@/hooks/useExpenseAccess";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

import PageHeader from "@/components/PageHeader";

const Despesas = () => {
  const { data: hasAccess, isLoading } = useHasExpenseAccess();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full border-red-200 bg-white shadow-xl rounded-2xl overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center px-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 border border-red-200 text-red-600 mb-6 shadow-sm">
              <Lock className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">
              Acesso Restrito
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              O Cartão de Despesas contém dados financeiros sensíveis. 
              Você não possui permissão para acessar esta área.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="gap-2 border-slate-200"
            >
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        category="FINANCEIRO & ORÇAMENTO"
        title="Cartão de Despesas"
        description="Controle e rastreamento completo de despesas alocadas por setor e acompanhamento de comprovantes."
      />
      <ExpenseCardModule />
    </div>
  );
};

export default Despesas;
