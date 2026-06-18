import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  ExpenseSchema, 
  ExpenseFormValues 
} from "@/schemas/ExpenseSchema";
import { 
  Expense, 
  useAddExpense, 
  useUpdateExpense, 
  useExpenseSectors, 
  useExpenseStatuses,
  useDeleteAttachment
} from "@/hooks/useExpenses";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, Upload, File, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ExpenseModalProps {
  expense?: Expense | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExpenseModal = ({ expense, isOpen, onClose }: ExpenseModalProps) => {
  const isEditMode = !!expense;
  const { data: sectors } = useExpenseSectors();
  const { data: statuses } = useExpenseStatuses();
  
  const { mutate: addExpense, isPending: isAdding } = useAddExpense();
  const { mutate: updateExpense, isPending: isUpdating } = useUpdateExpense();
  const { mutate: deleteAttachment, isPending: isDeletingAttachment } = useDeleteAttachment();

  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

  // Carrega status padrão caso a tabela remota esteja vazia
  const defaultStatuses = ["Aberto", "Em Análise", "Aprovado", "Comprado", "Pago", "Cancelado"];
  const availableStatuses = statuses && statuses.length > 0 ? statuses : defaultStatuses;

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(ExpenseSchema),
    defaultValues: {
      sector_id: "",
      purchase_date: new Date(),
      value: 0,
      description: "",
      ticket_number: "",
      ticket_date: undefined,
      status: "Aberto",
      observation: "",
    },
  });

  useEffect(() => {
    if (expense) {
      form.reset({
        sector_id: expense.sector_id,
        purchase_date: parseISO(expense.purchase_date),
        value: Number(expense.value),
        description: expense.description,
        ticket_number: expense.ticket_number || "",
        ticket_date: expense.ticket_date ? parseISO(expense.ticket_date) : undefined,
        status: expense.status,
        observation: expense.observation || "",
      });
    } else {
      form.reset({
        sector_id: "",
        purchase_date: new Date(),
        value: 0,
        description: "",
        ticket_number: "",
        ticket_date: undefined,
        status: "Aberto",
        observation: "",
      });
    }
    setFilesToUpload([]);
  }, [expense, form, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
      
      const filteredFiles = selectedFiles.filter(file => {
        const isValid = validTypes.includes(file.type);
        if (!isValid) {
          toast.error(`Arquivo "${file.name}" inválido. Permitido apenas PDF, JPG, JPEG e PNG.`);
        }
        return isValid;
      });

      setFilesToUpload(prev => [...prev, ...filteredFiles]);
    }
  };

  const handleRemoveFileToUpload = (index: number) => {
    setFilesToUpload(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingAttachment = (attachmentId: string, filePath: string) => {
    if (confirm("Você tem certeza que deseja excluir este anexo?")) {
      deleteAttachment({ attachmentId, filePath });
    }
  };

  const handleDownloadAttachment = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("evidences")
        .download(filePath);
      
      if (error) throw error;
      
      const url = window.URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      toast.error(`Erro ao baixar anexo: ${error.message}`);
    }
  };

  const onSubmit = (values: ExpenseFormValues) => {
    if (isEditMode) {
      updateExpense({ 
        id: expense.id, 
        formValues: values, 
        newAttachments: filesToUpload 
      }, {
        onSuccess: () => {
          onClose();
        }
      });
    } else {
      addExpense({ 
        formValues: values, 
        attachments: filesToUpload 
      }, {
        onSuccess: () => {
          onClose();
        }
      });
    }
  };

  const isPending = isAdding || isUpdating;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Lançamento de Despesa" : "Lançar Nova Despesa"}</DialogTitle>
          <DialogDescription>
            Insira os dados da despesa para atualizar o controle orçamentário.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Setor */}
              <FormField
                control={form.control}
                name="sector_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isEditMode}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um setor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sectors?.filter(s => s.active || s.id === expense?.sector_id).map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Valor */}
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição da Compra</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Toner da Impressora da Secretaria" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Data da Compra */}
              <FormField
                control={form.control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data da Compra</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : <span>Selecione a data</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableStatuses.map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nº do Chamado */}
              <FormField
                control={form.control}
                name="ticket_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nº Chamado / OS</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 5049382" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Data do Chamado */}
              <FormField
                control={form.control}
                name="ticket_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data do Chamado</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : <span>Selecione a data</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Observação */}
            <FormField
              control={form.control}
              name="observation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observação (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detalhes adicionais sobre o fornecedor, frete ou orçamento." 
                      className="resize-none h-20"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Anexos Existentes (Modo Edição) */}
            {isEditMode && expense?.expense_attachments && expense.expense_attachments.length > 0 && (
              <div className="space-y-2">
                <FormLabel>Anexos Atuais</FormLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-lg p-3 bg-secondary/20">
                  {expense.expense_attachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between p-2 rounded bg-card border shadow-sm text-xs">
                      <div className="flex items-center gap-2 overflow-hidden mr-2">
                        <File className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate" title={att.file_name}>{att.file_name}</span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDownloadAttachment(att.file_path, att.file_name)}
                        >
                          <Download className="h-3 h-3 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleDeleteExistingAttachment(att.id, att.file_path)}
                          disabled={isDeletingAttachment}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload de Novos Anexos */}
            <div className="space-y-2">
              <FormLabel>Carregar Comprovantes / Notas Fiscais</FormLabel>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-secondary/10 border-muted-foreground/30 hover:border-primary/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="mb-1 text-sm text-muted-foreground font-semibold">Clique para fazer upload</p>
                    <p className="text-xs text-muted-foreground/85">PDF, PNG, JPG, JPEG (Múltiplos permitidos)</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    multiple 
                    onChange={handleFileChange}
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                  />
                </label>
              </div>

              {/* Lista de Arquivos para Fazer Upload */}
              {filesToUpload.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {filesToUpload.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-primary/5 border border-primary/20 text-xs">
                      <div className="flex items-center gap-2 overflow-hidden mr-2">
                        <File className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="truncate" title={file.name}>{file.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveFileToUpload(idx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Salvar Alterações" : "Salvar Lançamento"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
