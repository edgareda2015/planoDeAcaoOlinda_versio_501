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
// Módulo Cartão de Despesa
import { ExpenseCardModule } from "@/components/ExpenseCardModule";

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
  <TabsContent value={type} className="mt-4 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Button onClick={handleOpenCreateActionModal} className="bg-primary hover:bg-primary/90">
        <PlusCircle className="mr-2 h-4 w-4" />
        Cadastrar Ação de {typeLabel}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isLoading || !actions.length} className="border-primary text-primary hover:bg-primary/5">
            <FileDown className="mr-2 h-4 w-4" />
            Exportar (Tabela)
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleExportExcel(type)}>Exportar para Excel (.xlsx)</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExportPdf(type)}>Exportar para PDF (.pdf)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    {isLoading ? (
      <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
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
  const { data: actions, isLoading: isLoadingActions, isError: isErrorActions } = useActions();

  // --- State para Principais Ações ---
  const [isKeyActionModalOpen, setIsKeyActionModalOpen] = useState(false);
  const [editingKeyAction, setEditingKeyAction] = useState<KeyAction | null>(null);
  const [actionToDelete, setActionToDelete] = useState<KeyAction | null>(null);
  const { data: keyActions, isLoading: isLoadingKeyActions, isError: isErrorKeyActions } = useKeyActions();
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

  // --- Lógica para Principais Ações ---
  const handleOpenCreateKeyActionModal = () => {
    setEditingKeyAction(null);
    setIsKeyActionModalOpen(true);
  };

  const handleOpenEditKeyActionModal = (action: KeyAction) => {
    setEditingKeyAction(action);
    setIsKeyActionModalOpen(true);
  };

  const handleDeleteKeyActionConfirm = () => {
    if (actionToDelete) {
      deleteKeyAction(actionToDelete.id, {
        onSuccess: () => setActionToDelete(null),
      });
    }
  };

  const handleExportKeyActions = (type: 'pdf' | 'excel') => {
    if (keyActions && keyActions.length > 0) {
      if (type === 'pdf') {
        exportKeyActionsToPdf(keyActions);
      } else {
        exportKeyActionsToExcel(keyActions);
      }
    }
  };

  const { activeVersion, activeUnitId } = useVersion();
  const { data: units } = useUnits();
  
  const currentUnitName = useMemo(() => {
    if (profile?.role === 'admin' && activeUnitId === 'all') return "Visão Global";
    const unit = units?.find(u => u.id === (activeUnitId || profile?.unit_id));
    return unit?.name || "Minha Unidade";
  }, [units, activeUnitId, profile]);

  const currentSemester = useMemo(() => {
    return activeVersion === 'all' || activeVersion === 'todos' ? '2026.1' : activeVersion;
  }, [activeVersion]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Gestão de Ações</h1>
        <p className="text-muted-foreground">
          Visualize, cadastre e gerencie todas as ações para atingir as metas.
        </p>
      </div>

      <Tabs defaultValue="matricula">
        <TabsList className="grid w-full grid-cols-4 h-auto p-0 bg-transparent border-b border-border rounded-none">
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
          <TabsTrigger 
            value="principais" 
            className={cn(
              "data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:border-emerald-600",
              "data-[state=active]:border-b-2 data-[state=active]:rounded-t-lg data-[state=active]:rounded-b-none",
              "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-secondary/50",
              "transition-all duration-200 py-3"
            )}
          >
            Cartão de Despesa
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

        {/* Aba Cartão de Despesa */}
        <TabsContent value="principais" className="mt-4 space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white text-sm font-bold shadow">R$</span>
              Cartão de Despesa
            </h2>
            <p className="text-muted-foreground text-sm">
              Controle e rastreamento completo de despesas por setor, com verba alocada e notas fiscais.
            </p>
          </div>
          <ExpenseCardModule />
        </TabsContent>
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