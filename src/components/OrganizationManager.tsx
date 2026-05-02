import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRegionals, useAddRegional, useDeleteRegional, useUnits, useAddUnit, useDeleteUnit } from "@/hooks/useOrganization";
import { Trash2, Building, MapPin, Loader2, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const OrganizationManager = () => {
  // Regionals
  const { data: regionals, isLoading: isRegionalsLoading } = useRegionals();
  const addRegional = useAddRegional();
  const deleteRegional = useDeleteRegional();
  const [newRegionalName, setNewRegionalName] = useState("");

  // Units
  const { data: units, isLoading: isUnitsLoading } = useUnits();
  const addUnit = useAddUnit();
  const deleteUnit = useDeleteUnit();
  const [newUnitName, setNewUnitName] = useState("");
  const [selectedRegionalId, setSelectedRegionalId] = useState<string>("");

  // Modal de confirmação de exclusão
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'regional' | 'unit'; id: string; name: string } | null>(null);

  const handleAddRegional = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegionalName.trim()) return;
    addRegional.mutate(newRegionalName, {
      onSuccess: () => setNewRegionalName(""),
    });
  };

  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim()) {
      toast.error("O nome da unidade é obrigatório.");
      return;
    }
    if (!selectedRegionalId) {
      toast.error("Selecione uma regional para vincular a unidade.");
      return;
    }
    addUnit.mutate({ name: newUnitName, regional_id: selectedRegionalId }, {
      onSuccess: () => setNewUnitName(""),
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'regional') {
      deleteRegional.mutate(deleteTarget.id, {
        onSuccess: () => setDeleteTarget(null),
        onError: () => setDeleteTarget(null),
      });
    } else {
      deleteUnit.mutate(deleteTarget.id, {
        onSuccess: () => setDeleteTarget(null),
        onError: () => setDeleteTarget(null),
      });
    }
  };

  return (
    <>
      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle>
                  Excluir {deleteTarget?.type === 'regional' ? 'Regional' : 'Unidade'}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Esta ação não pode ser desfeita.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir{' '}
              <strong className="text-foreground">{deleteTarget?.name}</strong>?
              Os dados vinculados serão desvinculados, mas não serão perdidos.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteRegional.isPending || deleteUnit.isPending}
            >
              {(deleteRegional.isPending || deleteUnit.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Regionais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Regionais
            </CardTitle>
            <CardDescription>Gerencie as regionais do sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAddRegional} className="flex gap-2">
              <Input
                placeholder="Nome da nova regional..."
                value={newRegionalName}
                onChange={(e) => setNewRegionalName(e.target.value)}
                disabled={addRegional.isPending}
              />
              <Button type="submit" disabled={addRegional.isPending || !newRegionalName.trim()}>
                {addRegional.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
              </Button>
            </form>

            <div className="rounded-md border mt-4">
              {isRegionalsLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : regionals?.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhuma regional cadastrada.
                </div>
              ) : (
                <ul className="divide-y max-h-[300px] overflow-y-auto">
                  {regionals?.map((regional) => (
                    <li key={regional.id} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                      <span className="font-medium text-sm">{regional.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget({ type: 'regional', id: regional.id, name: regional.name })}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Unidades */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Unidades
            </CardTitle>
            <CardDescription>Gerencie as unidades e vincule-as às regionais.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAddUnit} className="flex flex-col gap-3">
              <Select value={selectedRegionalId} onValueChange={setSelectedRegionalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a Regional" />
                </SelectTrigger>
                <SelectContent>
                  {regionals?.map((regional) => (
                    <SelectItem key={regional.id} value={regional.id}>
                      {regional.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome da nova unidade..."
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  disabled={addUnit.isPending}
                />
                <Button type="submit" disabled={addUnit.isPending || !newUnitName.trim() || !selectedRegionalId}>
                  {addUnit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
                </Button>
              </div>
            </form>

            <div className="rounded-md border mt-4">
              {isUnitsLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : units?.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhuma unidade cadastrada.
                </div>
              ) : (
                <ul className="divide-y max-h-[300px] overflow-y-auto">
                  {units?.map((unit) => (
                    <li key={unit.id} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{unit.name}</span>
                        <span className="text-xs text-muted-foreground">Regional: {unit.regionals?.name || "N/A"}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget({ type: 'unit', id: unit.id, name: unit.name })}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
