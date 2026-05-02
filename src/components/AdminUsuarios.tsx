import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Search, Shield, Building, MapPin, Loader2, UserCog, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";

const userFormSchema = z.object({
  email: z.string().email("Email inválido"),
  firstName: z.string().min(2, "Mínimo 2 caracteres"),
  lastName: z.string().min(2, "Mínimo 2 caracteres"),
  role: z.enum(["admin", "diretor_regional", "diretor_unidade"]),
  regionalId: z.string().uuid("Selecione uma regional").optional().nullable().or(z.literal("")),
  unitId: z.string().uuid().optional().nullable().or(z.literal("")),
});

export const AdminUsuarios = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const queryClient = useQueryClient();

  // Busca Usuários (Profiles)
  const { data: users, isLoading, error: usersError } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      console.log("Buscando perfis...");
      const { data, error } = await supabase
        .from("profiles")
        .select('*')
        .order("first_name", { ascending: true });
      
      if (error) {
        console.error("Erro ao buscar perfis:", error);
        throw error;
      }
      return data;
    },
  });

  // Busca Regionais e Unidades para o formulário e para mapear nomes na lista
  const { data: regionals } = useQuery({
    queryKey: ["regionals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("regionals").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: units } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("*");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      role: "diretor_unidade",
      firstName: "",
      lastName: "",
      email: "",
    },
  });

  const editForm = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      role: "diretor_unidade",
      firstName: "",
      lastName: "",
      email: "",
    },
  });

  // Mutação para criar usuário chamando a Edge Function
  const createUserMutation = useMutation({
    mutationFn: async (values: z.infer<typeof userFormSchema>) => {
      console.log("Enviando convite para:", values.email);
      const { data, error } = await supabase.functions.invoke('invite-clerk-user', {
        body: {
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          role: values.role,
          regionalId: values.regionalId,
          unitId: values.unitId,
        }
      });

      if (error) {
        console.error("Erro Supabase:", error);
        throw new Error("Falha na comunicação com o servidor.");
      }

      if (data?.error) {
        console.error("Erro Clerk:", data.error);
        throw new Error(data.error);
      }
      
      return data;
    },
    onSuccess: () => {
      toast.success("Convite enviado com sucesso!");
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao convidar usuário", {
        description: error.message,
      });
    },
  });

  // Mutação para Atualizar Usuário
  const updateUserMutation = useMutation({
    mutationFn: async (values: any) => {
      console.log("Atualizando usuário:", values);
      
      // 1. Atualizar no Supabase (Profiles)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          role: values.role,
          regional_id: values.regionalId && values.regionalId !== "" ? values.regionalId : null,
          unit_id: values.unitId && values.unitId !== "" ? values.unitId : null,
          first_name: values.firstName,
          last_name: values.lastName,
        })
        .eq("id", values.userId);

      if (profileError) throw profileError;

      // 2. Chamar Edge Function para sincronizar com Clerk
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: { 
          userId: values.userId,
          firstName: values.firstName,
          lastName: values.lastName,
          role: values.role,
          regionalId: values.regionalId && values.regionalId !== "" ? values.regionalId : null,
          unitId: values.unitId && values.unitId !== "" ? values.unitId : null
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário atualizado com sucesso!");
      setEditingUser(null);
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar usuário:", error);
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutação para Sincronizar com Clerk
  const syncUsersMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-clerk-users');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Sincronização concluída!", {
        description: `Encontrados ${data.foundInClerk} usuários no Clerk. Processados: ${data.processed}.`
      });
    },
    onError: (error: any) => {
      toast.error(`Erro na sincronização: ${error.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof userFormSchema>) => {
    createUserMutation.mutate(values);
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => {
      const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      const emailMatch = u.email?.toLowerCase().includes(searchLower);
      const roleMatch = u.role?.toLowerCase().includes(searchLower);
      return fullName.includes(searchLower) || emailMatch || roleMatch;
    });
  }, [users, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome ou papel..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 md:flex-none">
                <UserPlus className="mr-2 h-4 w-4" />
                Convidar Usuário
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Convidar Novo Usuário</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
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

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail (Login)</FormLabel>
                        <FormControl>
                          <Input placeholder="email@uninassau.edu.br" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Papel (Nível de Acesso)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                               <SelectItem value="admin">Admin Geral</SelectItem>
                               <SelectItem value="diretor_regional">Diretor Regional</SelectItem>
                               <SelectItem value="diretor_unidade">Diretor de Unidade</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="regionalId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Regional</FormLabel>
                          <Select 
                            onValueChange={(val) => {
                              field.onChange(val);
                              form.setValue('unitId', ''); // Reseta a unidade ao trocar a regional
                            }} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {regionals?.map(r => (
                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="unitId"
                    render={({ field }) => {
                      const selectedRegional = form.watch('regionalId');
                      const selectedRole = form.watch('role');
                      const filteredUnits = units?.filter(u => !selectedRegional || u.regional_id === selectedRegional);
                      
                      const isRegionalOnly = selectedRole === 'diretor_regional';
                      if (isRegionalOnly) return null;

                      return (
                        <FormItem>
                          <FormLabel>Unidade de Lotação</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!selectedRegional}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={selectedRegional ? "Selecione" : "Selecione uma regional primeiro"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filteredUnits?.map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={createUserMutation.isPending} className="w-full">
                      {createUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Enviar Convite via Clerk
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            onClick={() => syncUsersMutation.mutate()} 
            disabled={syncUsersMutation.isPending}
            className="border-primary text-primary hover:bg-primary/5 flex-1 md:flex-none"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", syncUsersMutation.isPending && "animate-spin")} />
            Sincronizar com Clerk
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[250px]">Usuário</TableHead>
              <TableHead>Nível de Acesso</TableHead>
              <TableHead>Regional / Unidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Carregando base de usuários...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : usersError ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-destructive">
                  Erro ao carregar usuários. Verifique as permissões.
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">{user.first_name} {user.last_name}</span>
                      <span className="text-[11px] text-primary font-medium">{user.email}</span>
                      <span className="text-[9px] text-muted-foreground truncate max-w-[200px]">ID: {user.id}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                      <Badge variant={
                        user.role === 'admin' ? 'default' : 
                        user.role === 'diretor_regional' ? 'secondary' : 'outline'
                      } className="gap-1 px-2 py-0.5 whitespace-nowrap">
                        <Shield className="h-3 w-3" />
                        {user.role === 'admin' ? 'Admin Geral' : 
                         user.role === 'diretor_regional' ? 'Regional' : 'Diretor'}
                      </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-foreground">
                        <MapPin className="h-3 w-3 text-primary/60" />
                        {regionals?.find(r => r.id === user.regional_id)?.name || "N/A"}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Building className="h-3 w-3" />
                        {units?.find(u => u.id === user.unit_id)?.name || "N/A"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.ativo ? "outline" : "destructive"} className={cn(
                      "px-2 py-0",
                      user.ativo ? "border-green-500/50 text-green-600 bg-green-50" : ""
                    )}>
                      {user.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setEditingUser(user);
                        editForm.reset({
                          firstName: user.first_name || "",
                          lastName: user.last_name || "",
                          email: user.email || "",
                          role: user.role,
                          regionalId: user.regional_id || "",
                          unitId: user.unit_id || "",
                        });
                      }}
                    >
                      <UserCog className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Edição */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Editar Usuário
            </DialogTitle>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((values) => updateUserMutation.mutate({ ...values, userId: editingUser.id }))} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sobrenome</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível de Acesso</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o nível" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin Geral</SelectItem>
                        <SelectItem value="diretor_regional">Diretor Regional</SelectItem>
                        <SelectItem value="diretor_unidade">Diretor de Unidade</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="regionalId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Regional</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a regional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {regionals?.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="unitId"
                render={({ field }) => {
                  const selectedRegionalId = editForm.watch("regionalId");
                  const filteredUnits = units?.filter(u => u.regional_id === selectedRegionalId) || [];
                  
                  return (
                    <FormItem>
                      <FormLabel>Unidade</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={!selectedRegionalId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a unidade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredUnits.map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <DialogFooter className="pt-4">
                <Button type="submit" disabled={updateUserMutation.isPending} className="w-full">
                  {updateUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
