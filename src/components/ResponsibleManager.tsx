import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useResponsibles, Responsible } from "@/hooks/useActions"; // Updated hook
import { useAddResponsible, useUpdateResponsible, useDeleteResponsible } from "@/hooks/useAdmin"; // Updated hooks

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, MoreHorizontal, Pencil, Trash2, User } from "lucide-react";
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

// Simplified Schema for Responsibles
const ResponsibleSchema = z.object({
  firstName: z.string().min(2, { message: "O nome é obrigatório." }),
  lastName: z.string().min(2, { message: "O sobrenome é obrigatório." }),
});

type ResponsibleFormValues = z.infer<typeof ResponsibleSchema>;

export const ResponsibleManager = () => {
  const { data: responsibles, isLoading } = useResponsibles();
  const { mutate: addResponsible, isPending: isAdding } = useAddResponsible();
  const { mutate: updateResponsible, isPending: isUpdating } = useUpdateResponsible();
  const { mutate: deleteResponsible, isPending: isDeleting } = useDeleteResponsible();

  const [editingResponsible, setEditingResponsible] = useState<Responsible | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [responsibleToDelete, setResponsibleToDelete] = useState<Responsible | null>(null);

  const form = useForm<ResponsibleFormValues>({
    resolver: zodResolver(ResponsibleSchema),
    defaultValues: { firstName: "", lastName: "" },
  });

  const onSubmit = (values: ResponsibleFormValues) => {
    if (editingResponsible) {
      updateResponsible(
        {
          id: editingResponsible.id,
          ...values,
        },
        {
          onSuccess: () => {
            setEditingResponsible(null);
            form.reset({ firstName: "", lastName: "" });
          },
        },
      );
    } else {
      addResponsible(values, {
        onSuccess: () => form.reset(),
      });
    }
  };

  const handleEdit = (responsible: Responsible) => {
    setEditingResponsible(responsible);
    form.reset({
      firstName: responsible.first_name,
      lastName: responsible.last_name,
    });
  };

  const handleCancelEdit = () => {
    setEditingResponsible(null);
    form.reset({ firstName: "", lastName: "" });
  };

  const handleDeleteClick = (responsible: Responsible) => {
    setResponsibleToDelete(responsible);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (responsibleToDelete) {
      deleteResponsible(responsibleToDelete.id, {
        onSuccess: () => {
          setDeleteConfirmOpen(false);
          setResponsibleToDelete(null);
        },
      });
    }
  };

  const isPending = isAdding || isUpdating;

  return (
    <>
      <div className="grid gap-8 md:grid-cols-2">
        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle>{editingResponsible ? "Editar Responsável" : "Cadastrar Novo Responsável"}</CardTitle>
            <CardDescription>
              Adicione ou edite pessoas na lista de responsáveis por ações.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: João" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sobrenome</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Silva" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingResponsible ? "Salvar Alterações" : "Cadastrar"}
                  </Button>
                  {editingResponsible && (
                    <Button type="button" variant="outline" onClick={handleCancelEdit}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>Responsáveis Cadastrados</CardTitle>
            <CardDescription>Lista de todas as pessoas responsáveis.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Carregando...
              </div>
            )}
            {responsibles && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="w-[64px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responsibles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center">
                        Nenhum responsável cadastrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    responsibles.map((responsible) => (
                      <TableRow key={responsible.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={responsible.avatar_url} />
                              <AvatarFallback>
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {responsible.first_name} {responsible.last_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(responsible)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteClick(responsible)} className="text-destructive">
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

      {/* AlertDialog para exclusão */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o responsável{" "}
              <strong>
                {responsibleToDelete?.first_name} {responsibleToDelete?.last_name}
              </strong>.
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