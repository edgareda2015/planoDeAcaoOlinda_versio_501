import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSectors, Sector } from "@/hooks/useGoals";
import { useAddSector, useUpdateSector, useDeleteSector } from "@/hooks/useAdmin";
import { useVersion } from "@/contexts/VersionContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const SectorSchema = z.object({
  name: z.string().min(2, { message: "O nome do setor é obrigatório." }),
  description: z.string().optional(),
  type: z.enum(['matricula', 'coordenacao', 'administrativo']),
});

type SectorFormValues = z.infer<typeof SectorSchema>;

export const SectorManager = () => {
  const { activeUnitId } = useVersion();
  const { data: sectors, isLoading } = useSectors();
  const { mutate: addSector, isPending: isAdding } = useAddSector();
  const { mutate: updateSector, isPending: isUpdating } = useUpdateSector();
  const { mutate: deleteSector, isPending: isDeleting } = useDeleteSector();

  const isAllUnits = activeUnitId === 'all';

  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sectorToDelete, setSectorToDelete] = useState<Sector | null>(null);

  const form = useForm<SectorFormValues>({
    resolver: zodResolver(SectorSchema),
    defaultValues: { name: "", description: "", type: "matricula" },
  });

  const onSubmit = (values: SectorFormValues) => {
    if (isAllUnits && !editingSector) {
      toast.error("Selecione uma unidade específica para cadastrar um novo setor.");
      return;
    }
    
    if (editingSector) {
      updateSector({ ...values, id: editingSector.id }, {
        onSuccess: () => {
          setEditingSector(null);
          form.reset({ name: "", description: "", type: "matricula" });
        }
      });
    } else {
      addSector({ ...values, unit_id: activeUnitId }, {
        onSuccess: () => form.reset(),
      });
    }
  };

  const handleEdit = (sector: Sector) => {
    setEditingSector(sector);
    form.reset({
      name: sector.name,
      description: sector.description || "",
      type: sector.type || 'matricula',
    });
  };

  const handleCancelEdit = () => {
    setEditingSector(null);
    form.reset({ name: "", description: "", type: "matricula" });
  };

  const handleDeleteClick = (sector: Sector) => {
    setSectorToDelete(sector);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (sectorToDelete) {
      deleteSector(sectorToDelete.id, {
        onSuccess: () => {
          setDeleteConfirmOpen(false);
          setSectorToDelete(null);
        }
      });
    }
  };

  const isPending = isAdding || isUpdating;

  const getTypeLabel = (type: Sector['type']) => {
    switch (type) {
      case 'matricula': return 'Matrícula';
      case 'coordenacao': return 'Coordenação';
      case 'administrativo': return 'Ritual de Gestão';
      default: return 'Desconhecido';
    }
  };

  const getTypeVariant = (type: Sector['type']) => {
    switch (type) {
      case 'matricula': return 'default';
      case 'coordenacao': return 'secondary';
      case 'administrativo': return 'warning';
      default: return 'outline';
    }
  };

  return (
    <>
      <div className="grid gap-8 md:grid-cols-2">
        {/* Formulário de Cadastro/Edição */}
        <Card>
          <CardHeader>
            <CardTitle>{editingSector ? "Editar Área" : "Cadastrar Nova Área"}</CardTitle>
            <CardDescription>
              {editingSector ? `Alterando os dados de "${editingSector.name}".` : "Adicione um novo item para vincular metas e ações."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Financeiro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Área</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue="matricula">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="matricula">Matrícula</SelectItem>
                            <SelectItem value="coordenacao">Coordenação</SelectItem>
                            <SelectItem value="administrativo">Ritual de Gestão</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Breve descrição" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={isPending || (isAllUnits && !editingSector)}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingSector ? "Salvar Alterações" : "Cadastrar"}
                  </Button>
                  {editingSector && (
                    <Button type="button" variant="outline" onClick={handleCancelEdit}>
                      Cancelar
                    </Button>
                  )}
                </div>
                {isAllUnits && !editingSector && (
                  <p className="text-xs text-amber-600 font-medium mt-2">
                    ⚠️ Selecione uma unidade no menu lateral para habilitar o cadastro.
                  </p>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Tabela de Setores */}
        <Card>
          <CardHeader>
            <CardTitle>Áreas Cadastradas</CardTitle>
            <CardDescription>Lista de todos os itens disponíveis no sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-muted-foreground">Carregando...</p>}
            {sectors && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="w-[64px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">Nenhum item cadastrado.</TableCell>
                    </TableRow>
                  ) : (
                    sectors.map((sector) => (
                      <TableRow key={sector.id}>
                        <TableCell className="font-medium">{sector.name}</TableCell>
                        <TableCell>
                          <Badge variant={getTypeVariant(sector.type)} className="capitalize">
                            {getTypeLabel(sector.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(sector)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteClick(sector)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AlertDialog para confirmação de exclusão */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente "{sectorToDelete?.name}" e pode afetar metas e ações associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};