import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EvidenceAlbumSchema, EvidenceAlbumFormValues } from "@/schemas/EvidenceSchema";
import { useAddAlbum, useUpdateAlbum } from "@/hooks/useEvidence";
import { useActions, Action } from "@/hooks/useActions";
import { optimizeImage, generateThumbnail } from "@/lib/imageOptimization";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Loader2, Upload, X, Search, Image as ImageIcon, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CreateAlbumModalProps {
  album?: any | null; // For editing metadados
  isOpen: boolean;
  onClose: () => void;
}

export const CreateAlbumModal = ({ album, isOpen, onClose }: CreateAlbumModalProps) => {
  const isEditMode = !!album;
  const { data: actions, isLoading: isLoadingActions } = useActions();
  const { mutate: addAlbum, isPending: isAdding } = useAddAlbum();
  const { mutate: updateAlbum, isPending: isUpdating } = useUpdateAlbum();

  // Tabs: "free" (Álbum Livre) ou "linked" (Álbum Vinculado)
  const [albumType, setAlbumType] = useState<"free" | "linked">("free");
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);

  // Files to upload
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string }[]>([]);
  const [coverPhotoIndex, setCoverPhotoIndex] = useState<number>(0);
  const [photoDescriptions, setPhotoDescriptions] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const form = useForm<EvidenceAlbumFormValues>({
    resolver: zodResolver(EvidenceAlbumSchema),
    defaultValues: {
      title: "",
      description: "",
      action_id: null,
      responsible_name: "",
      date: new Date(),
      participants: "",
      leads_captured: 0,
      action_result: "",
      observations: "",
      cover_photo_url: null,
      regional_id: null,
      unit_id: null,
    },
  });

  // Reseta form ao abrir ou editar
  useEffect(() => {
    if (isOpen) {
      if (album) {
        form.reset({
          title: album.title,
          description: album.description || "",
          action_id: album.action_id || null,
          responsible_name: album.responsible_name || "",
          date: album.date ? parseISO(album.date) : new Date(),
          participants: album.participants || "",
          leads_captured: album.leads_captured || 0,
          action_result: album.action_result || "",
          observations: album.observations || "",
          cover_photo_url: album.cover_photo_url || null,
          regional_id: album.regional_id || null,
          unit_id: album.unit_id || null,
        });
        setAlbumType(album.action_id ? "linked" : "free");
        setSelectedFiles([]);
      } else {
        form.reset({
          title: "",
          description: "",
          action_id: null,
          responsible_name: "",
          date: new Date(),
          participants: "",
          leads_captured: 0,
          action_result: "",
          observations: "",
          cover_photo_url: null,
          regional_id: null,
          unit_id: null,
        });
        setAlbumType("free");
        setSelectedAction(null);
        setSelectedFiles([]);
      }
    }
  }, [album, isOpen, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const newFiles = filesArray.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setPhotoDescriptions((prev) => [...prev, ...filesArray.map(() => "")]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
    setPhotoDescriptions((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    if (coverPhotoIndex === index) {
      setCoverPhotoIndex(0);
    } else if (coverPhotoIndex > index) {
      setCoverPhotoIndex((prev) => prev - 1);
    }
  };

  // Preenche dados da ação vinculada
  const handleLinkAction = (actionId: string) => {
    if (!actions) return;
    const action = actions.find((a) => a.id === actionId);
    if (action) {
      setSelectedAction(action);
      form.setValue("action_id", action.id);
      
      // Auto-preenchimento inteligente dos metadados da ação
      form.setValue("title", `Evidências: ${action.description.substring(0, 50)}...`);
      form.setValue("responsible_name", action.responsible_name || "");
      if (action.start_date) {
        form.setValue("date", parseISO(action.start_date));
      }
      form.setValue("leads_captured", action.effective_enrollment || action.completed_enrollment || 0);
      form.setValue("description", action.how_to_do || "");
      form.setValue("observations", action.observations || "");
      form.setValue("regional_id", null); // O hook calculará a regional da unidade
      form.setValue("unit_id", null);     // O hook calculará com base no contexto ativo
      
      toast.success("Dados da ação importados!");
    }
  };

  const onSubmit = async (values: EvidenceAlbumFormValues) => {
    if (isEditMode) {
      updateAlbum(
        { id: album.id, formValues: values },
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    } else {
      if (selectedFiles.length === 0) {
        toast.error("Adicione pelo menos 1 foto para criar o álbum.");
        return;
      }

      try {
        setUploadProgress({ current: 0, total: selectedFiles.length });
        
        // Otimização de imagens paralela com progresso
        const optimizedPhotos: { file: File; optimized: Blob; thumb: Blob }[] = [];
        
        for (let i = 0; i < selectedFiles.length; i++) {
          const item = selectedFiles[i];
          setUploadProgress({ current: i + 1, total: selectedFiles.length });

          const [optimized, thumb] = await Promise.all([
            optimizeImage(item.file),
            generateThumbnail(item.file)
          ]);

          optimizedPhotos.push({
            file: item.file,
            optimized,
            thumb
          });
        }

        addAlbum(
          { formValues: values, photos: optimizedPhotos, coverPhotoIndex, photoDescriptions },
          {
            onSuccess: () => {
              setUploadProgress(null);
              setPhotoDescriptions([]);
              onClose();
            },
            onError: () => {
              setUploadProgress(null);
            }
          }
        );
      } catch (err) {
        console.error(err);
        toast.error("Falha ao otimizar e carregar as imagens.");
        setUploadProgress(null);
      }
    }
  };

  const isPending = isAdding || isUpdating || uploadProgress !== null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Álbum" : "Criar Álbum de Evidências"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Atualize as informações do álbum."
              : "Cadastre evidências fotográficas das suas ações e eventos."}
          </DialogDescription>
        </DialogHeader>

        {!isEditMode && (
          <Tabs
            value={albumType}
            onValueChange={(val) => {
              setAlbumType(val as any);
              if (val === "free") {
                setSelectedAction(null);
                form.setValue("action_id", null);
              }
            }}
            className="w-full mb-4"
          >
            <TabsList className="grid grid-cols-2 w-full max-w-[400px]">
              <TabsTrigger value="free">Álbum Livre</TabsTrigger>
              <TabsTrigger value="linked">Vincular a Ação</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-grow flex flex-col min-h-0">
            <div className="flex-grow overflow-y-auto max-h-[60vh] pr-3 -mr-3 space-y-6 pb-4">
              <div className="space-y-6 pb-4">
                {albumType === "linked" && !isEditMode && (
                  <div className="bg-secondary/40 p-4 rounded-lg border border-border">
                    <FormLabel className="text-xs font-bold uppercase tracking-wider mb-2 block">
                      Buscar Ação Cadastrada
                    </FormLabel>
                    <div className="flex gap-2 items-center">
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        onChange={(e) => handleLinkAction(e.target.value)}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Selecione uma ação...
                        </option>
                        {actions?.map((act) => (
                          <option key={act.id} value={act.id}>
                            {act.sectors?.name} - {act.description.substring(0, 60)}...
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Coluna da Esquerda: Dados do Álbum */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título do Álbum *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Inauguração do Polo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="responsible_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Responsável *</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome completo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Data da Atividade *</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "justify-start text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione</span>}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={(date) => field.onChange(date || new Date())}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
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
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Resumo do evento ou atividade de evidência..."
                              {...field}
                              value={field.value || ""}
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />


                  </div>

                  {/* Coluna da Direita: Resultados + Mídia */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="action_result"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resultado da Ação (Opcional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Matrículas, retornos comerciais, etc."
                              {...field}
                              value={field.value || ""}
                              rows={2}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="observations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações / Notas</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Comentários e anotações extras..."
                              {...field}
                              value={field.value || ""}
                              rows={2}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Área de Fotos (Apenas modo Criação) */}
                    {!isEditMode && (
                      <div className="space-y-2">
                        <FormLabel>Carregar Fotos da Evidência *</FormLabel>
                        <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 flex flex-col items-center justify-center bg-secondary/10 hover:bg-secondary/20 transition cursor-pointer relative">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={isPending}
                          />
                          <Upload className="h-8 w-8 text-muted-foreground mb-2 animate-bounce" />
                          <span className="text-sm font-semibold">Arraste ou Selecione as fotos</span>
                          <span className="text-xs text-muted-foreground mt-1">Formatos suportados: JPG, PNG, WEBP</span>
                        </div>

                        {selectedFiles.length > 0 && (
                          <div className="mt-4 border p-3 rounded-lg bg-secondary/5">
                            <span className="text-xs font-bold text-muted-foreground block mb-3">
                              FOTOS SELECIONADAS ({selectedFiles.length}) — ⭐ ESTRELA = CAPA
                            </span>
                            <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1 py-1">
                              {selectedFiles.map((file, idx) => {
                                const isCover = idx === coverPhotoIndex;
                                return (
                                  <div key={idx} className="flex gap-3 items-start">
                                    {/* Miniatura */}
                                    <div
                                      onClick={() => setCoverPhotoIndex(idx)}
                                      className={cn(
                                        "relative group rounded-md overflow-hidden shrink-0 w-20 h-20 border bg-secondary cursor-pointer transition-all duration-200",
                                        isCover ? "ring-2 ring-warning border-warning" : "hover:border-primary/50"
                                      )}
                                    >
                                      <img
                                        src={file.preview}
                                        alt="Preview"
                                        className="object-cover w-full h-full"
                                      />
                                      {/* Star Button */}
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setCoverPhotoIndex(idx); }}
                                        className={cn(
                                          "absolute top-1 left-1 rounded-full p-1 transition shadow duration-200",
                                          isCover
                                            ? "bg-warning text-warning-foreground"
                                            : "bg-black/40 text-white/70 hover:bg-black/60 hover:text-white"
                                        )}
                                        title="Definir como capa"
                                      >
                                        <Star className="h-3 w-3 fill-current" />
                                      </button>
                                      {/* Delete */}
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-90 hover:opacity-100 transition shadow"
                                        title="Remover foto"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                    {/* Campo de descrição */}
                                    <div className="flex-1">
                                      <label className="text-xs text-muted-foreground font-semibold mb-1 block">
                                        Foto {idx + 1}{isCover ? " (CAPA)" : ""}
                                      </label>
                                      <textarea
                                        placeholder="Adicione uma legenda ou descrição para esta foto (opcional)..."
                                        value={photoDescriptions[idx] || ""}
                                        onChange={(e) => {
                                          const updated = [...photoDescriptions];
                                          updated[idx] = e.target.value;
                                          setPhotoDescriptions(updated);
                                        }}
                                        rows={3}
                                        disabled={isPending}
                                        className="w-full text-xs px-2 py-1.5 border rounded-md bg-background resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground placeholder:text-muted-foreground"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Barra de Progresso de Compressão/Upload */}
            {uploadProgress !== null && (
              <div className="bg-secondary/60 p-4 rounded-lg border flex flex-col gap-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Processando e Carregando Imagens...</span>
                  <span>{uploadProgress.current} / {uploadProgress.total}</span>
                </div>
                <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Salvar Alterações" : "Criar Álbum"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
