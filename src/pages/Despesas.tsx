import { ExpenseCardModule } from "@/components/ExpenseCardModule";

const Despesas = () => {
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
