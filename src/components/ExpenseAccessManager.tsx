import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, ShieldCheck, Plus, Trash2, Loader2, Search, UserPlus, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useExpenseAccessList,
  useAddExpenseAccess,
  useRemoveExpenseAccess,
  useIsExpenseAdmin,
} from "@/hooks/useExpenseAccess";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const EXPENSE_ADMIN_EMAIL = "edgar.tavares@mauriciodenassau.edu.br";

export const ExpenseAccessManager = () => {
  const isExpenseAdmin = useIsExpenseAdmin();
  const { data: accessList, isLoading } = useExpenseAccessList();
  const { mutate: addAccess, isPending: isAdding } = useAddExpenseAccess();
  const { mutate: removeAccess, isPending: isRemoving } = useRemoveExpenseAccess();

  const [newEmail, setNewEmail] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Buscar todos os perfis para sugestões de autocomplete
  const { data: allProfiles } = useQuery({
    queryKey: ["profiles_for_access"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, role")
        .order("first_name");
      if (error) throw new Error(error.message);
      return data as { id: string; email: string; first_name: string; last_name: string; role: string }[];
    },
  });

  // Filtrar sugestões: perfis que NÃO estão na lista de acesso
  const suggestions = useMemo(() => {
    if (!allProfiles || !newEmail || newEmail.length < 2) return [];
    const existingEmails = new Set(accessList?.map(a => a.email.toLowerCase()) || []);
    return allProfiles
      .filter(p => p.email && !existingEmails.has(p.email.toLowerCase()))
      .filter(p =>
        p.email?.toLowerCase().includes(newEmail.toLowerCase()) ||
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(newEmail.toLowerCase())
      )
      .slice(0, 8);
  }, [allProfiles, accessList, newEmail]);

  // Filtrar lista exibida
  const filteredList = useMemo(() => {
    if (!accessList) return [];
    if (!searchFilter) return accessList;
    return accessList.filter(a =>
      a.email.toLowerCase().includes(searchFilter.toLowerCase())
    );
  }, [accessList, searchFilter]);

  if (!isExpenseAdmin) {
    return (
      <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Lock className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Acesso Restrito</h3>
          <p className="text-sm text-red-600/80 dark:text-red-400/70 mt-1 max-w-md">
            Apenas o administrador principal pode gerenciar o acesso ao Cartão de Despesas.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleAdd = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    addAccess(email, {
      onSuccess: () => {
        setNewEmail("");
        setShowSuggestions(false);
      },
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    removeAccess(deleteTarget, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg shadow-emerald-600/20">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Controle de Acesso — Cartão de Despesas</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie quais usuários podem visualizar a página de despesas.
          </p>
        </div>
      </div>

      {/* Card de adição */}
      <Card className="shadow-md border-emerald-200/50 dark:border-emerald-900/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-emerald-600" />
            Conceder Acesso
          </CardTitle>
          <CardDescription>
            Digite o e-mail do usuário ou pesquise pelo nome para conceder acesso ao Cartão de Despesas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Digite o e-mail ou nome do usuário..."
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                    if (e.key === "Escape") setShowSuggestions(false);
                  }}
                  className="pr-4"
                />
                {/* Dropdown de sugestões */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {suggestions.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setNewEmail(p.email);
                          setShowSuggestions(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left border-b last:border-b-0 border-border/50"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                          {p.first_name?.[0]}{p.last_name?.[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {p.first_name} {p.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {p.role === "admin" ? "Admin" : p.role === "diretor_regional" ? "Regional" : "Unidade"}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                onClick={handleAdd}
                disabled={isAdding || !newEmail.trim() || !newEmail.includes("@")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Conceder
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuários com acesso */}
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Usuários Autorizados
              {accessList && (
                <Badge variant="secondary" className="ml-1">{accessList.length}</Badge>
              )}
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filtrar por e-mail..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5">
                  <TableHead>E-mail</TableHead>
                  <TableHead>Concedido por</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-[80px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredList.map((entry) => {
                    const isAdminMaster = entry.email.toLowerCase() === EXPENSE_ADMIN_EMAIL;
                    return (
                      <TableRow
                        key={entry.id}
                        className={cn(
                          "hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors",
                          isAdminMaster && "bg-emerald-50/50 dark:bg-emerald-950/10"
                        )}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{entry.email}</span>
                            {isAdminMaster && (
                              <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">
                                Admin Master
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {entry.granted_by}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(parseISO(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isAdminMaster || isRemoving}
                            onClick={() => setDeleteTarget({ id: entry.id, email: entry.email })}
                            title={isAdminMaster ? "Não é possível remover o admin master" : "Remover acesso"}
                            className={cn(
                              "h-8 w-8",
                              isAdminMaster
                                ? "text-muted-foreground/30 cursor-not-allowed"
                                : "text-muted-foreground hover:text-destructive"
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação de remoção */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Acesso</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o acesso de{" "}
              <span className="font-bold text-foreground">{deleteTarget?.email}</span>{" "}
              ao Cartão de Despesas? O usuário não poderá mais visualizar os dados financeiros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remover Acesso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
