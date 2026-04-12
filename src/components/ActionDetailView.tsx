import { Action, ActionStatus, useUpdateAction } from "@/hooks/useActions";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { Calendar, User, ClipboardCheck, Link as LinkIcon, Building, Tag } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ActionChecklist } from "./ActionChecklist";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ActionDetailViewProps {
  action: Action | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

const statusConfig: Record<ActionStatus, { label: string; className: string }> = {
  planning: { label: "A Fazer", className: "bg-destructive text-destructive-foreground" },
  partial: { label: "Pendente", className: "bg-amber-500 text-white" },
  completed: { label: "Finalizado", className: "bg-accent text-accent-foreground" },
  delayed: { label: "Atrasado", className: "bg-orange-500 text-white" },
  cancelled: { label: "Cancelado", className: "bg-muted text-muted-foreground" },
};

const DetailItem = ({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) => (
  <div>
    <h4 className="text-sm font-semibold text-muted-foreground flex items-center mb-1">
      <Icon className="h-4 w-4 mr-2" />
      {label}
    </h4>
    <div className="text-base text-foreground pl-6">{children || <span className="text-muted-foreground italic">Não informado</span>}</div>
  </div>
);

const ActionDetailContent = ({ action, onEdit, onClose }: { action: Action; onEdit: () => void; onClose: () => void }) => {
  const { mutate: updateAction } = useUpdateAction();

  const handleStatusChange = (status: ActionStatus) => {
    updateAction({ id: action.id, status });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl">{action.description}</DialogTitle>
        <DialogDescription>
          Detalhes da ação para a unidade {action.unidade}
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-6">
        {/* Coluna Principal */}
        <div className="md:col-span-2 space-y-6">
          <DetailItem icon={ClipboardCheck} label="Como será feito?">
            <p className="whitespace-pre-wrap">{action.how_to_do}</p>
          </DetailItem>
          <Separator />
          <ActionChecklist actionId={action.id} />
        </div>
        {/* Coluna de Detalhes */}
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center mb-2">
              <Tag className="h-4 w-4 mr-2" />
              Status
            </h4>
            <Select value={action.status} onValueChange={handleStatusChange}>
              <SelectTrigger className={cn("w-full border-0 focus:ring-0 font-semibold", statusConfig[action.status].className)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusConfig).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DetailItem icon={Building} label="Área">
            {action.sectors.name}
          </DetailItem>
          <DetailItem icon={User} label="Responsável">
            {action.responsible_name}
          </DetailItem>
          <DetailItem icon={Calendar} label="Prazo">
            {action.start_date ? format(new Date(action.start_date), "dd/MM/yy") : "?"} - {action.end_date ? format(new Date(action.end_date), "dd/MM/yy") : "?"}
          </DetailItem>
          <DetailItem icon={LinkIcon} label="Evidências">
            {action.evidence_url ? (
              <a href={action.evidence_url} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 break-all">
                {action.evidence_url}
              </a>
            ) : null}
          </DetailItem>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Fechar</Button>
        <Button onClick={onEdit}>Editar Ação</Button>
      </div>
    </>
  );
};

export const ActionDetailView = ({ action, isOpen, onClose, onEdit }: ActionDetailViewProps) => {
  const isMobile = useIsMobile();

  if (!action) return null;

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent>
          <ScrollArea className="h-[85vh] overflow-y-auto p-4">
            <ActionDetailContent action={action} onEdit={onEdit} onClose={onClose} />
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <ActionDetailContent action={action} onEdit={onEdit} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
};