import { useState } from "react";
import { useActions, Action } from "@/hooks/useActions";
import { Loader2, XCircle, FileDown, PlusCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { exportToPdf } from "@/lib/exportUtils";
import { slugify, cn } from "@/lib/utils";
import { ActionKanbanBoard } from "./ActionKanbanBoard";
import { ActionModal } from "./ActionModal";
import { getSectorColors } from "@/lib/sector-config";

interface SectorDashboardProps {
  sectorId: string;
  sectorName: string;
  sectorType: 'matricula' | 'coordenacao' | 'administrativo';
}

export const SectorDashboard = ({ sectorId, sectorName, sectorType }: SectorDashboardProps) => {
  const { data: actions, isLoading, isError } = useActions();
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);

  const handleOpenCreateActionModal = () => {
    setEditingAction(null);
    setIsActionModalOpen(true);
  };

  const handleOpenEditActionModal = (action: Action) => {
    setEditingAction(action);
    setIsActionModalOpen(true);
  };

  const handleCloseActionModal = () => {
    setIsActionModalOpen(false);
    setEditingAction(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !actions) {
    return (
      <Card className="p-6 text-destructive flex items-center justify-center min-h-[400px]">
        <XCircle className="h-5 w-5 mr-2" />
        Erro ao carregar o plano de ação.
      </Card>
    );
  }

  const sectorActions = actions.filter(action => action.sector_id === sectorId);

  const handleExportPdf = () => {
    if (sectorActions) {
      const fileName = `plano-de-acao-${slugify(sectorName)}.pdf`;
      exportToPdf(sectorActions, fileName, sectorName);
    }
  };

  // Lógica para obter a cor correta, usando o tipo como fallback se o nome não tiver cor específica
  const sectorColors = getSectorColors(sectorName);
  let headerColorClass = sectorColors.header.bg;
  let headerHoverClass = sectorColors.header.hover;

  // Se a cor retornada for a cor padrão (cinza), usamos a cor do tipo de setor
  if (sectorColors.header.bg === 'bg-gray-600') {
    if (sectorType === 'matricula') {
      headerColorClass = 'bg-primary';
      headerHoverClass = 'hover:bg-primary/90';
    } else if (sectorType === 'coordenacao') {
      headerColorClass = 'bg-accent';
      headerHoverClass = 'hover:bg-accent/90';
    } else if (sectorType === 'administrativo') {
      // Usando a cor roxa definida no Sidebar
      headerColorClass = 'bg-violet-600';
      headerHoverClass = 'hover:bg-violet-600/90';
    }
  }
  
  const typeLabel = sectorType === 'matricula' ? 'Matrícula' : sectorType === 'coordenacao' ? 'Coordenação' : 'Ritual de Gestão';

  return (
    <>
      <div className="space-y-8">
        {/* Header Colorido */}
        <Card className={cn("p-6", headerColorClass, "text-primary-foreground")}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium uppercase opacity-80">
                Área de {typeLabel}
              </p>
              <h1 className="text-3xl font-bold">
                Plano de Ação: {sectorName}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleOpenCreateActionModal} variant="secondary" className={cn(headerHoverClass)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Cadastrar Ação
              </Button>
              <Button onClick={handleExportPdf} disabled={isLoading || !sectorActions?.length} variant="secondary" className={cn(headerHoverClass)}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
            </div>
          </div>
        </Card>

        {/* Ações do Setor */}
        <ActionKanbanBoard actions={sectorActions} onEditAction={handleOpenEditActionModal} />
      </div>
      <ActionModal action={editingAction} isOpen={isActionModalOpen} onClose={handleCloseActionModal} />
    </>
  );
};