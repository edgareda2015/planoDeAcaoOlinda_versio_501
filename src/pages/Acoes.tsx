import { useState, useMemo } from "react";
import { ActionModal } from "@/components/ActionModal";
import { Button } from "@/components/ui/button";
import { PlusCircle, FileDown } from "lucide-react";
import { Action, useActions } from "@/hooks/useActions";
import { exportToExcel, exportToPdf, exportKeyActionsToPdf, exportKeyActionsToExcel } from "@/lib/exportUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Imports para abas existentes
import { useKeyActions, KeyAction, useDeleteKeyAction } from "@/hooks/useKeyActions";
import { KeyActionModal } from "@/components/KeyActionModal";
import { XCircle, Loader2, Coins, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { ActionKanbanBoard } from "@/components/ActionKanbanBoard";
import { cn } from "@/lib/utils";
import { useVersion } from "@/contexts/VersionContext";
import { useUnits } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";


import PageHeader from "@/components/PageHeader";

// Componente auxiliar para renderizar o conteúdo da aba de Ações
const ActionTabContent = ({
  actions,
  isLoading,
  typeLabel,
  handleOpenCreateActionModal,
  handleOpenEditActionModal,
  handleExportExcel,
  handleExportPdf,
  type,
}: {
  actions: Action[];
  isLoading: boolean;
  typeLabel: string;
  handleOpenCreateActionModal: () => void;
  handleOpenEditActionModal: (action: Action) => void;
  handleExportExcel: (type: 'matricula' | 'coordenacao' | 'administrativo') => void;
  handleExportPdf: (type: 'matricula' | 'coordenacao' | 'administrativo') => void;
  type: 'matricula' | 'coordenacao' | 'administrativo';
}) => (
  <TabsContent value={type} className="mt-6 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
      <Button onClick={handleOpenCreateActionModal} variant="gold" className="gap-2">
        <PlusCircle className="h-4 w-4" />
        Cadastrar Ação ({typeLabel})
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isLoading || !actions.length} className="gap-2 border-slate-200">
            <FileDown className="h-4 w-4 text-[#0B1727]" />
            Exportar Relatório
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => handleExportExcel(type)} className="cursor-pointer">
            Exportar para Excel (.xlsx)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExportPdf(type)} className="cursor-pointer">
            Exportar para PDF (.pdf)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    {isLoading ? (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
      </div>
    ) : (
      <ActionKanbanBoard actions={actions} onEditAction={handleOpenEditActionModal} />
    )}
  </TabsContent>
);

const Acoes = () => {
  // --- State para Ações (Matrícula/Coordenação/Administrativo) ---
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const { profile } = useAuth();
  const { data: actions, isLoading: isLoadingActions } = useActions();

  // --- State para Principais Ações ---
  const [isKeyActionModalOpen, setIsKeyActionModalOpen] = useState(false);
  const [editingKeyAction, setEditingKeyAction] = useState<KeyAction | null>(null);
  const [actionToDelete, setActionToDelete] = useState<KeyAction | null>(null);
  const { data: keyActions } = useKeyActions();
  const { mutate: deleteKeyAction, isPending: isDeletingKeyAction } = useDeleteKeyAction();

  // --- Lógica para Ações (Matrícula/Coordenação/Administrativo) ---
  const matriculaActions = useMemo(() => {
    return actions?.filter(action => action.sectors?.type === 'matricula') || [];
  }, [actions]);

  const coordenacaoActions = useMemo(() => {
    return actions?.filter(action => action.sectors?.type === 'coordenacao') || [];
  }, [actions]);

  const administrativoActions = useMemo(() => {
    return actions?.filter(action => action.sectors?.type === 'administrativo') || [];
  }, [actions]);

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

  const handleExportExcel = (type: 'matricula' | 'coordenacao' | 'administrativo') => {
    let dataToExport: Action[] = [];
    let fileNameSuffix = '';

    if (type === 'matricula') {
      dataToExport = matriculaActions;
      fileNameSuffix = 'matricula';
    } else if (type === 'coordenacao') {
      dataToExport = coordenacaoActions;
      fileNameSuffix = 'coordenacao';
    } else if (type === 'administrativo') {
      dataToExport = administrativoActions;
      fileNameSuffix = 'ritual-gestao';
    }

    if (dataToExport.length > 0) {
      exportToExcel(dataToExport, `plano-de-acao-${fileNameSuffix}.xlsx`);
    }
  };

  const handleExportPdf = (type: 'matricula' | 'coordenacao' | 'administrativo') => {
    let dataToExport: Action[] = [];
    let fileNameSuffix = '';

    if (type === 'matricula') {
      dataToExport = matriculaActions;
      fileNameSuffix = 'matricula';
    } else if (type === 'coordenacao') {
      dataToExport = coordenacaoActions;
      fileNameSuffix = 'coordenacao';
    } else if (type === 'administrativo') {
      dataToExport = administrativoActions;
      fileNameSuffix = 'ritual-gestao';
    }

    if (dataToExport.length > 0) {
      exportToPdf(dataToExport, `plano-de-acao-${fileNameSuffix}.pdf`);
    }
  };

  const handleDeleteKeyActionConfirm = () => {
    if (actionToDelete) {
      deleteKeyAction(actionToDelete.id, {
        onSuccess: () => setActionToDelete(null),
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        category="OPERAÇÃO & RITUAIS"
        title="Gestão de Ações"
        description="Visualize, cadastre e acompanhe o status de execução de todas as ações estratégicas por setor."
      />

      <Tabs defaultValue="matricula">
        <TabsList className="grid w-full grid-cols-3 h-auto p-0 bg-transparent border-b border-border rounded-none">
          <TabsTrigger 
            value="matricula" 
            className={cn(
              "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:border-primary",
              "data-[state=active]:border-b-2 data-[state=active]:rounded-t-lg data-[state=active]:rounded-b-none",
              "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-secondary/50",
              "transition-all duration-200 py-3"
            )}
          >
            Comercial / QG
          </TabsTrigger>
          <TabsTrigger 
            value="coordenacao" 
            className={cn(
              "data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-md data-[state=active]:border-accent",
              "data-[state=active]:border-b-2 data-[state=active]:rounded-t-lg data-[state=active]:rounded-b-none",
              "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-secondary/50",
              "transition-all duration-200 py-3"
            )}
          >
            Coordenação
          </TabsTrigger>
          <TabsTrigger 
            value="administrativo" 
            className={cn(
              "data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:border-violet-600",
              "data-[state=active]:border-b-2 data-[state=active]:rounded-t-lg data-[state=active]:rounded-b-none",
              "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-secondary/50",
              "transition-all duration-200 py-3"
            )}
          >
            Ritual de Gestão
          </TabsTrigger>
        </TabsList>
        
        {/* Aba Matrícula */}
        <ActionTabContent
          actions={matriculaActions}
          isLoading={isLoadingActions}
          typeLabel="Comercial / QG"
          handleOpenCreateActionModal={handleOpenCreateActionModal}
          handleOpenEditActionModal={handleOpenEditActionModal}
          handleExportExcel={handleExportExcel}
          handleExportPdf={handleExportPdf}
          type="matricula"
        />
        
        {/* Aba Coordenação */}
        <ActionTabContent
          actions={coordenacaoActions}
          isLoading={isLoadingActions}
          typeLabel="Coordenação"
          handleOpenCreateActionModal={handleOpenCreateActionModal}
          handleOpenEditActionModal={handleOpenEditActionModal}
          handleExportExcel={handleExportExcel}
          handleExportPdf={handleExportPdf}
          type="coordenacao"
        />

        {/* Aba Ritual de Gestão (Administrativo) */}
        <ActionTabContent
          actions={administrativoActions}
          isLoading={isLoadingActions}
          typeLabel="Ritual de Gestão"
          handleOpenCreateActionModal={handleOpenCreateActionModal}
          handleOpenEditActionModal={handleOpenEditActionModal}
          handleExportExcel={handleExportExcel}
          handleExportPdf={handleExportPdf}
          type="administrativo"
        />


      </Tabs>

      {/* Modais */}
      <ActionModal action={editingAction} isOpen={isActionModalOpen} onClose={handleCloseActionModal} />
      <KeyActionModal isOpen={isKeyActionModalOpen} onClose={() => setIsKeyActionModalOpen(false)} action={editingKeyAction} />

      {/* AlertDialog para Principais Ações */}
      <AlertDialog open={!!actionToDelete} onOpenChange={(open) => !open && setActionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a ação para o curso "{actionToDelete?.course}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteKeyActionConfirm} disabled={isDeletingKeyAction}>
              {isDeletingKeyAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Acoes;