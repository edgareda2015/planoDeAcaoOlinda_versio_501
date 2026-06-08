import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAlbumDetails, useDeleteAlbum, useAddPhotosToAlbum, useDeletePhoto, useUpdatePhotoDescription, useUpdateAlbum } from "@/hooks/useEvidence";
import { CreateAlbumModal } from "@/components/CreateAlbumModal";
import { generateIndividualPDF } from "@/lib/pdfGenerator";
import { downloadAlbumZIP } from "@/lib/zipExporter";
import { optimizeImage, generateThumbnail } from "@/lib/imageOptimization";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  Calendar,
  User,
  Building,
  Plus,
  Trash2,
  Download,
  Edit,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
  FileDown,
  Loader2,
  Upload,
  Info,
  TrendingUp,
  Award,
  Users,
  Pencil,
  MessageSquare,
  Image as ImageIcon,
  Star,
  RotateCcw
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function DetalhesAlbum() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Queries & Mutations
  const { data: album, isLoading, error } = useAlbumDetails(id || "");
  const { mutate: deleteAlbum, isPending: isDeleting } = useDeleteAlbum();
  const { mutate: addPhotos, isPending: isAddingPhotos } = useAddPhotosToAlbum();
  const { mutate: deletePhoto, isPending: isDeletingPhoto } = useDeletePhoto();
  const { mutate: updatePhotoDesc, isPending: isUpdatingDesc } = useUpdatePhotoDescription();
  const { mutate: updateAlbum } = useUpdateAlbum();

  // Modals & Viewers State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPos, setStartPanPos] = useState({ x: 0, y: 0 });
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isDownloadingZIP, setIsDownloadingZIP] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // Edit Photo Description State
  const [editingPhoto, setEditingPhoto] = useState<{ id: string; description: string } | null>(null);
  const [editDescText, setEditDescText] = useState("");

  // Reordering state
  const [localPhotos, setLocalPhotos] = useState<any[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Sync localPhotos with custom order from localStorage or DB
  useEffect(() => {
    if (album?.photos) {
      const savedOrder = localStorage.getItem(`album_photos_order_${id}`);
      if (savedOrder) {
        try {
          const orderedIds = JSON.parse(savedOrder) as string[];
          const photoMap = new Map(album.photos.map((p) => [p.id, p]));
          const sorted: any[] = [];
          
          orderedIds.forEach((pId) => {
            const photo = photoMap.get(pId);
            if (photo) {
              sorted.push(photo);
              photoMap.delete(pId);
            }
          });
          
          // Adiciona fotos que não estavam salvas no localStorage (ex: novas)
          photoMap.forEach((photo) => {
            sorted.push(photo);
          });
          
          setLocalPhotos(sorted);
        } catch (e) {
          console.error("Erro ao ordenar fotos do localStorage:", e);
          setLocalPhotos(album.photos);
        }
      } else {
        setLocalPhotos(album.photos);
      }
    }
  }, [album?.photos, id]);

  // Key navigation for lightbox (incluindo zoom por teclado)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null || !localPhotos.length) return;
      if (e.key === "ArrowRight") {
        handleNextImage();
      } else if (e.key === "ArrowLeft") {
        handlePrevImage();
      } else if (e.key === "Escape") {
        setLightboxIndex(null);
        setZoomScale(1);
        setPanOffset({ x: 0, y: 0 });
      } else if (e.key === "+" || e.key === "=") {
        setZoomScale((prev) => Math.min(prev + 0.25, 4));
      } else if (e.key === "-") {
        setZoomScale((prev) => {
          const nextScale = Math.max(prev - 0.25, 1);
          if (nextScale === 1) setPanOffset({ x: 0, y: 0 });
          return nextScale;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, localPhotos]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
        <span className="text-sm font-semibold">Carregando detalhes do álbum...</span>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Info className="h-12 w-12 text-destructive mb-2" />
        <span className="text-base font-bold">Erro ao carregar o álbum</span>
        <Button onClick={() => navigate("/galeria")} className="mt-4">
          Voltar para Galeria
        </Button>
      </div>
    );
  }

  // Lógica do Lightbox
  const handlePrevImage = () => {
    if (lightboxIndex === null || !localPhotos.length) return;
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setLightboxIndex(lightboxIndex === 0 ? localPhotos.length - 1 : lightboxIndex - 1);
  };

  const handleNextImage = () => {
    if (lightboxIndex === null || !localPhotos.length) return;
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setLightboxIndex(lightboxIndex === localPhotos.length - 1 ? 0 : lightboxIndex + 1);
  };

  // Drag & Drop Handlers para reordenação
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex || !localPhotos.length) return;

    const reordered = [...localPhotos];
    const [draggedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, draggedItem);

    setLocalPhotos(reordered);
    setDraggedIndex(null);

    // Salva a nova ordenação localmente
    const orderedIds = reordered.map((p) => p.id);
    localStorage.setItem(`album_photos_order_${id}`, JSON.stringify(orderedIds));
    toast.success("Legendas e posições reorganizadas localmente!");
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Atualizar Foto de Capa do Álbum
  const handleSetCoverPhoto = (photoUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;
    updateAlbum(
      { id, formValues: { cover_photo_url: photoUrl } },
      {
        onSuccess: () => {
          toast.success("Foto de capa do álbum atualizada com sucesso!");
        }
      }
    );
  };

  // Lógica de Pan & Zoom para o Lightbox
  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (zoomScale <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    setStartPanPos({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isPanning || zoomScale <= 1) return;
    e.preventDefault();
    setPanOffset({
      x: e.clientX - startPanPos.x,
      y: e.clientY - startPanPos.y,
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const zoomFactor = 0.15;
    if (e.deltaY < 0) {
      // Zoom In
      setZoomScale((prev) => Math.min(prev + zoomFactor, 4));
    } else {
      // Zoom Out
      setZoomScale((prev) => {
        const nextScale = Math.max(prev - zoomFactor, 1);
        if (nextScale === 1) {
          setPanOffset({ x: 0, y: 0 });
        }
        return nextScale;
      });
    }
  };

  // Upload de Fotos Adicionais
  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !id) return;
    const filesArray = Array.from(e.target.files);
    
    try {
      setPhotoUploadProgress({ current: 0, total: filesArray.length });
      
      const optimizedPhotos: { file: File; optimized: Blob; thumb: Blob }[] = [];
      for (let i = 0; i < filesArray.length; i++) {
        setPhotoUploadProgress({ current: i + 1, total: filesArray.length });
        const file = filesArray[i];

        const [optimized, thumb] = await Promise.all([
          optimizeImage(file),
          generateThumbnail(file)
        ]);

        optimizedPhotos.push({
          file,
          optimized,
          thumb
        });
      }

      addPhotos(
        { albumId: id, photos: optimizedPhotos },
        {
          onSuccess: () => {
            setPhotoUploadProgress(null);
          },
          onError: () => {
            setPhotoUploadProgress(null);
          }
        }
      );
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar as novas fotos.");
      setPhotoUploadProgress(null);
    }
  };

  // Remoção de Foto Única
  const handleDeletePhoto = (photoId: string, storagePath: string, thumbnailStoragePath: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita acionar o Lightbox
    if (!id) return;
    deletePhoto({ photoId, albumId: id, storagePath, thumbnailStoragePath });
  };

  // Exclusão do Álbum Inteiro
  const handleConfirmDeleteAlbum = () => {
    if (!id) return;
    deleteAlbum(id, {
      onSuccess: () => {
        navigate("/galeria");
      },
    });
  };

  // Geração de PDF Individual
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const pdfBlob = await generateIndividualPDF({
        ...album,
        unit_name: album.units?.name || "N/A",
        regional_name: album.regionals?.name || "N/A",
        action_name: album.actions?.description || undefined
      });
      
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio_evidencia_${album.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success("PDF baixado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Geração de ZIP do Álbum
  const handleDownloadZIP = async () => {
    setIsDownloadingZIP(true);
    try {
      // 1. Gera o PDF do relatório individual
      const pdfBlob = await generateIndividualPDF({
        ...album,
        unit_name: album.units?.name || "N/A",
        regional_name: album.regionals?.name || "N/A",
        action_name: album.actions?.description || undefined
      });

      // 2. Prepara as fotos para download no ZIP
      const photosForZip = album.photos.map((p, idx) => ({
        photo_url: p.photo_url,
        name: `foto_${idx + 1}`
      }));

      // 3. Compacta e baixa o ZIP
      await downloadAlbumZIP(album.title, pdfBlob, photosForZip);
      toast.success("Álbum ZIP baixado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao baixar o ZIP do álbum.");
    } finally {
      setIsDownloadingZIP(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Botão de Voltar */}
      <Button
        variant="ghost"
        onClick={() => navigate("/galeria")}
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para Galeria
      </Button>

      {/* Info Cabeçalho / Ações */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-6 bg-card/40 border p-6 rounded-2xl shadow-sm backdrop-blur">
        <div className="space-y-3 flex-grow">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant={album.action_id ? "default" : "secondary"}>
              {album.action_id ? "Ação Vinculada" : "Álbum Livre"}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              {album.date ? new Date(album.date).toLocaleDateString('pt-BR') : "N/A"}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Building className="h-3 w-3" />
              {album.units?.name || "N/A"}
            </Badge>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground uppercase tracking-tight">
            {album.title}
          </h1>
          {album.description && (
            <p className="text-muted-foreground text-sm max-w-[800px] leading-relaxed">
              {album.description}
            </p>
          )}
        </div>

        {/* Painel de Botões */}
        <div className="flex flex-wrap gap-2 w-full lg:w-auto shrink-0">
          <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="gap-1">
            {isGeneratingPDF ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 text-emerald-500" />
            )}
            Relatório PDF
          </Button>

          <Button variant="outline" size="sm" onClick={handleDownloadZIP} disabled={isDownloadingZIP} className="gap-1">
            {isDownloadingZIP ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4 text-primary" />
            )}
            Baixar ZIP
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)} className="gap-1">
            <Edit className="h-4 w-4 text-warning" />
            Editar
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1" disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso excluirá permanentemente o álbum <strong>{album.title}</strong> e todas as fotos correspondentes do storage. Esta ação é irreversível.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDeleteAlbum} className="bg-red-500 hover:bg-red-600">
                  Confirmar Exclusão
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lado Esquerdo: Metadados do Álbum / Detalhes de Ação */}
        <div className="space-y-6">
          <Card className="bg-card/50 border-border/80 shadow-sm backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" /> Metadados do Álbum
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-foreground">
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground block uppercase">Responsável</span>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span>{album.responsible_name || "N/A"}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground block uppercase">Unidade e Regional</span>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-primary" />
                  <span>{album.units?.name || "N/A"} ({album.regionals?.name || "N/A"})</span>
                </div>
              </div>


              {album.participants && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-muted-foreground block uppercase">Participantes</span>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-xs bg-secondary/80 px-2 py-1 rounded border">
                      {album.participants}
                    </span>
                  </div>
                </div>
              )}

              {album.action_id && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-muted-foreground block uppercase">Ação Vinculada</span>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <span className="line-clamp-2">{album.actions?.description || "N/A"}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seções de Texto Extra (Resultados / Observações) */}
          {(album.action_result || album.observations) && (
            <Card className="bg-card/50 border-border/80 shadow-sm backdrop-blur">
              <CardContent className="p-6 space-y-6">
                {album.action_result && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Resultados Obtidos
                    </h3>
                    <p className="text-sm text-foreground bg-secondary/20 p-3 rounded-lg border border-border/40 leading-relaxed">
                      {album.action_result}
                    </p>
                  </div>
                )}

                {album.observations && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Observações Adicionais
                    </h3>
                    <p className="text-sm text-foreground bg-secondary/20 p-3 rounded-lg border border-border/40 leading-relaxed">
                      {album.observations}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Lado Direito: A Galeria de Fotos */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card/50 border-border/80 shadow-sm backdrop-blur">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" /> Galeria ({album.photos?.length || 0} fotos)
              </CardTitle>

              {/* Botão de Upload na Galeria */}
              <div className="relative cursor-pointer">
                <Button size="sm" disabled={isAddingPhotos} className="gap-1 text-xs">
                  {isAddingPhotos ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 animate-bounce" />
                  )}
                  Adicionar Fotos
                </Button>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleAddPhotos}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isAddingPhotos}
                />
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {/* Progresso de carregamento de novas fotos */}
              {photoUploadProgress !== null && (
                <div className="bg-secondary/60 p-4 rounded-lg border mb-6 flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Otimizando e Carregando Novas Imagens...</span>
                    <span>{photoUploadProgress.current} / {photoUploadProgress.total}</span>
                  </div>
                  <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(photoUploadProgress.current / photoUploadProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {localPhotos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-2" />
                  <span className="text-sm">Nenhuma foto neste álbum ainda.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {localPhotos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className={`flex flex-col gap-1 transition-all duration-200 ${
                        draggedIndex === index ? "opacity-30 scale-95 border-dashed" : ""
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                    >
                      <div
                        className="relative group rounded-xl overflow-hidden aspect-square border cursor-pointer hover:border-primary/50 bg-secondary transition-all"
                        onClick={() => setLightboxIndex(index)}
                      >
                        <img
                          src={photo.thumbnail_url || photo.photo_url}
                          alt={`Evidência ${index + 1}`}
                          className="object-cover w-full h-full group-hover:scale-105 transition duration-300"
                          loading="lazy"
                        />

                        {/* Overlay de Ações */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-all duration-200 flex items-end justify-end gap-1.5 p-2">
                          {/* Definir como Capa */}
                          <button
                            onClick={(e) => handleSetCoverPhoto(photo.photo_url, e)}
                            className={`rounded p-1.5 transition duration-200 border border-white/10 ${
                              album.cover_photo_url === photo.photo_url
                                ? "bg-warning hover:bg-warning/80 text-black opacity-100"
                                : "bg-black/60 hover:bg-yellow-500 hover:text-black text-white opacity-0 group-hover:opacity-100"
                            }`}
                            title={album.cover_photo_url === photo.photo_url ? "Foto de Capa Ativa" : "Definir como Capa"}
                          >
                            <Star className={`h-3.5 w-3.5 ${album.cover_photo_url === photo.photo_url ? "fill-black text-black" : ""}`} />
                          </button>

                          {/* Editar Descrição */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPhoto({ id: photo.id, description: photo.description || "" });
                              setEditDescText(photo.description || "");
                            }}
                            className="bg-black/60 hover:bg-primary text-white rounded p-1.5 opacity-0 group-hover:opacity-100 transition duration-200 border border-white/10"
                            title="Editar descrição"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          {/* Excluir */}
                          <button
                            onClick={(e) => handleDeletePhoto(photo.id, photo.storage_path, photo.thumbnail_storage_path, e)}
                            disabled={isDeletingPhoto}
                            className="bg-black/60 hover:bg-red-600 text-white rounded p-1.5 opacity-0 group-hover:opacity-100 transition duration-200 border border-white/10"
                            title="Excluir foto"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </button>
                        </div>

                        {/* Badge se tiver descrição */}
                        {photo.description && (
                          <div className="absolute top-2 left-2">
                            <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                              <MessageSquare className="h-2.5 w-2.5" /> Legenda
                            </span>
                          </div>
                        )}
                        
                        {/* Indicador de Capa */}
                        {album.cover_photo_url === photo.photo_url && (
                          <div className="absolute top-2 right-2">
                            <span className="bg-warning text-black text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow border border-yellow-400">
                              Capa
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Legenda abaixo da miniatura */}
                      {photo.description && (
                        <p className="text-xs text-muted-foreground leading-snug px-0.5 line-clamp-2">
                          {photo.description}
                        </p>
                      )}
                      {photo.posted_by_name && (
                        <p className="text-[10px] text-muted-foreground/60 px-0.5 flex items-center gap-1">
                          <User className="h-2.5 w-2.5" /> {photo.posted_by_name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO DO ÁLBUM */}
      <CreateAlbumModal
        album={album}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />

      {/* MODAL DE EDIÇÃO DE DESCRIÇÃO DA FOTO */}
      <Dialog open={!!editingPhoto} onOpenChange={(open) => { if (!open) setEditingPhoto(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" /> Editar Descrição da Foto
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Adicione uma legenda ou descrição para esta foto..."
              value={editDescText}
              onChange={(e) => setEditDescText(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">A descrição aparecerá na galeria, no lightbox e nos relatórios PDF.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingPhoto(null)}>Cancelar</Button>
            <Button
              disabled={isUpdatingDesc}
              onClick={() => {
                if (!editingPhoto || !id) return;
                updatePhotoDesc(
                  { photoId: editingPhoto.id, albumId: id, description: editDescText },
                  { onSuccess: () => setEditingPhoto(null) }
                );
              }}
            >
              {isUpdatingDesc && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Descrição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LIGHTBOX / VISUALIZADOR TELA CHEIA */}
      {lightboxIndex !== null && localPhotos.length > 0 && (
        <div 
          onWheel={handleWheel}
          className="fixed inset-0 z-50 flex flex-col bg-black/97 text-white animate-fade-in select-none"
        >
          {/* Top Bar do Lightbox */}
          <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-b from-black/90 to-transparent shrink-0">
            <span className="text-sm font-medium flex items-center gap-2">
              {lightboxIndex + 1} / {localPhotos.length} — {album.title}
              {zoomScale > 1 && (
                <span className="text-xs text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                  Zoom: {Math.round(zoomScale * 100)}%
                </span>
              )}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setZoomScale((prev) => {
                    const nextScale = Math.max(prev - 0.25, 1);
                    if (nextScale === 1) setPanOffset({ x: 0, y: 0 });
                    return nextScale;
                  });
                }}
                className="hover:bg-white/15 p-2 rounded transition"
                title="Zoom Out (-)"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <button
                onClick={() => setZoomScale((prev) => Math.min(prev + 0.25, 4))}
                className="hover:bg-white/15 p-2 rounded transition"
                title="Zoom In (+)"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                onClick={() => { setZoomScale(1); setPanOffset({ x: 0, y: 0 }); }}
                className="hover:bg-white/15 p-2 rounded transition"
                title="Ajustar à Tela"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
              {/* Editar descrição direto do lightbox */}
              <button
                onClick={() => {
                  const photo = localPhotos[lightboxIndex];
                  setEditingPhoto({ id: photo.id, description: photo.description || "" });
                  setEditDescText(photo.description || "");
                }}
                className="hover:bg-white/15 p-2 rounded transition"
                title="Editar descrição"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setLightboxIndex(null); setZoomScale(1); setPanOffset({ x: 0, y: 0 }); }}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition"
                title="Fechar (ESC)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Central: Imagem e Controles Laterais */}
          <div className="flex-grow flex items-center justify-between px-4 min-h-0 relative overflow-hidden">
            {/* Prev */}
            <button
              onClick={handlePrevImage}
              className="absolute left-4 z-10 bg-black/50 hover:bg-black/80 p-3 rounded-full border border-white/10 transition"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            {/* Imagem */}
            <div className="w-full h-full flex items-center justify-center p-4 overflow-hidden">
              <img
                src={localPhotos[lightboxIndex].photo_url}
                alt={`Slide ${lightboxIndex + 1}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                className={`max-h-full max-w-full object-contain ${
                  isPanning ? "cursor-grabbing" : zoomScale > 1 ? "cursor-grab" : "cursor-zoom-in"
                }`}
                style={{ 
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                  transition: isPanning ? "none" : "transform 0.15s ease-out"
                }}
                draggable={false}
              />
            </div>

            {/* Next */}
            <button
              onClick={handleNextImage}
              className="absolute right-4 z-10 bg-black/50 hover:bg-black/80 p-3 rounded-full border border-white/10 transition"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Bottom Bar — Descrição + Metadados */}
          <div className="shrink-0 bg-gradient-to-t from-black/95 to-transparent px-8 py-5">
            {localPhotos[lightboxIndex].description ? (
              <div className="max-w-2xl mx-auto">
                <div className="flex items-start gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-white/90 leading-relaxed">
                    {localPhotos[lightboxIndex].description}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-white/40 mt-2">
                  {localPhotos[lightboxIndex].posted_by_name && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {localPhotos[lightboxIndex].posted_by_name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(localPhotos[lightboxIndex].created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                  <span className="text-white/25">Role o scroll para zoom | Arraste para mover | ← → ou ESC para navegar</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-white/30">
                Sem descrição — clique em ✏️ para adicionar. Role o scroll para zoom | Arraste para mover | ← → ou ESC para navegar.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
