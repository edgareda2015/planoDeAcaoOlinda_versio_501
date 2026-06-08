import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAlbums, useEvidenceStats } from "@/hooks/useEvidence";
import { useUnits, useRegionals } from "@/hooks/useOrganization";
import { CreateAlbumModal } from "@/components/CreateAlbumModal";
import { generateConsolidatedPDF } from "@/lib/pdfGenerator";
import { downloadConsolidatedZIP } from "@/lib/zipExporter";
import { useAuth } from "@/contexts/AuthContext";
import { useVersion } from "@/contexts/VersionContext";
import {
  Image as ImageIcon,
  Plus,
  Search,
  Calendar,
  User,
  Building,
  TrendingUp,
  Users,
  Award,
  Download,
  CheckSquare,
  Square,
  FileDown,
  Loader2,
  FolderOpen,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function GaleriaEvidencias() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { activeVersion, activeUnitId } = useVersion();

  // Queries
  const { data: albums, isLoading } = useAlbums();
  const { data: stats, isLoading: isLoadingStats } = useEvidenceStats();
  const { data: units } = useUnits();
  const { data: regionals } = useRegionals();

  // Modals & Selections
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Filtragem dos álbuns (apenas por texto)
  const filteredAlbums = useMemo(() => {
    if (!albums) return [];
    return albums.filter((album) => {
      const matchesSearch =
        album.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (album.description && album.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (album.responsible_name && album.responsible_name.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesSearch;
    });
  }, [albums, searchTerm]);

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Calculando o total de páginas
  const totalPages = Math.ceil(filteredAlbums.length / itemsPerPage);

  // Fatiando os álbuns da página atual
  const paginatedAlbums = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAlbums.slice(startIndex, endIndex);
  }, [filteredAlbums, currentPage, itemsPerPage]);

  // Ações de Seleção
  const toggleSelectAlbum = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita navegar para a página de detalhes
    setSelectedAlbumIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedAlbumIds.length === filteredAlbums.length) {
      setSelectedAlbumIds([]);
    } else {
      setSelectedAlbumIds(filteredAlbums.map((a) => a.id));
    }
  };

  // Exportação consolidada dos selecionados
  const handleExportSelected = async () => {
    if (selectedAlbumIds.length === 0) return;
    setIsExporting(true);

    try {
      // 1. Filtra os álbuns selecionados
      const albumsToExport = albums?.filter((a) => selectedAlbumIds.includes(a.id)) || [];
      
      // 2. Busca os detalhes completos (com fotos) para cada álbum
      const fullAlbumsData = await Promise.all(
        albumsToExport.map(async (album) => {
          // Busca fotos deste álbum
          const { data: photos } = await supabase
            .from("evidence_photos")
            .select("photo_url, thumbnail_url")
            .eq("album_id", album.id);
          
          return {
            ...album,
            photos: photos || [],
            unit_name: units?.find(u => u.id === album.unit_id)?.name || "",
            regional_name: regionals?.find(r => r.id === album.regional_id)?.name || ""
          };
        })
      );

      // 3. Filtros formatados para o cabeçalho do PDF (calculados a partir do contexto da versão ativa/perfil)
      const effectiveUnitId = (profile?.role === "diretor_unidade" && profile?.unit_id)
        ? profile.unit_id
        : (activeUnitId !== "all" ? activeUnitId : null);

      const effectiveRegionalId = (profile?.role === "diretor_regional" && profile?.regional_id)
        ? profile.regional_id
        : null;

      const currentUnitName = effectiveUnitId
        ? units?.find((u) => u.id === effectiveUnitId)?.name || "N/A"
        : "Todas";

      const currentRegionalName = effectiveRegionalId
        ? regionals?.find((r) => r.id === effectiveRegionalId)?.name || "N/A"
        : (effectiveUnitId
          ? regionals?.find((r) => r.id === units?.find((u) => u.id === effectiveUnitId)?.regional_id)?.name || "Todas"
          : "Todas");

      // 4. Gera PDF Consolidado
      const pdfBlob = await generateConsolidatedPDF(fullAlbumsData as any[], {
        period: activeVersion === "all" ? "Todos" : activeVersion,
        unit: currentUnitName,
        regional: currentRegionalName
      });

      // 5. Prepara dados para o ZIP
      const zipAlbums = await Promise.all(
        fullAlbumsData.map(async (album) => {
          // Precisamos gerar o PDF individual de cada álbum
          const { jsPDF } = await import("jspdf");
          // Para otimização de tempo, passamos o pdf individual como blob
          const { generateIndividualPDF } = await import("@/lib/pdfGenerator");
          const indPdfBlob = await generateIndividualPDF(album as any);

          return {
            title: album.title,
            pdfBlob: indPdfBlob,
            photos: album.photos.map((p, pIdx) => ({
              photo_url: p.photo_url,
              name: `foto_${pIdx + 1}`
            }))
          };
        })
      );

      // 6. Faz o download do ZIP consolidado contendo relatório e pastas organizadas
      await downloadConsolidatedZIP("consolidado_evidencias", pdfBlob, zipAlbums);
      toast.success("Exportação concluída!");
      setSelectedAlbumIds([]);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar a exportação consolidada.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">
            Galeria de Evidências
          </h1>
          <p className="text-muted-foreground mt-1">
            Registro visual e acompanhamento fotográfico das atividades.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-md">
          <Plus className="h-5 w-5" /> Novo Álbum
        </Button>
      </div>

      {/* Dashboard de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur border-border/80 hover:shadow-md transition">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total de Álbuns
            </CardTitle>
            <FolderOpen className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{stats?.albumsCount || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Álbuns criados no período ativo</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/80 hover:shadow-md transition">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Fotos Registradas
            </CardTitle>
            <ImageIcon className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{stats?.totalPhotos || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Evidências fotográficas carregadas</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/80 hover:shadow-md transition">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Ações Vinculadas
            </CardTitle>
            <Award className="h-5 w-5 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{stats?.linkedActionsCount || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Álbuns integrados a ações do plano</p>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Filtros (Apenas Busca por Texto) */}
      <Card className="bg-card/30 border-border/50 shadow-sm backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar álbum por título, descrição ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-background/80 pl-10 h-11 text-sm shadow-inner"
            />
          </div>
        </CardContent>
      </Card>

      {/* Ações de Seleção em lote */}
      {filteredAlbums.length > 0 && (
        <div className="flex justify-between items-center bg-secondary/30 px-4 py-3 rounded-lg border">
          <Button variant="ghost" onClick={toggleSelectAll} className="gap-2 text-xs font-bold uppercase">
            {selectedAlbumIds.length === filteredAlbums.length ? (
              <>
                <CheckSquare className="h-4 w-4 text-primary" /> Desmarcar Todos
              </>
            ) : (
              <>
                <Square className="h-4 w-4" /> Selecionar Todos
              </>
            )}
          </Button>

          {selectedAlbumIds.length > 0 && (
            <div className="flex items-center gap-2 animate-fade-in">
              <span className="text-xs font-bold text-muted-foreground hidden sm:inline">
                {selectedAlbumIds.length} selecionado(s)
              </span>
              <Button
                onClick={handleExportSelected}
                disabled={isExporting}
                size="sm"
                className="gap-2 text-xs uppercase shadow-sm"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando Exportação...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" /> Exportar ZIP Consolidado
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Grade de Álbuns */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
          <span className="text-sm font-semibold">Carregando álbuns de evidências...</span>
        </div>
      ) : filteredAlbums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-lg bg-card/10">
          <ImageIcon className="h-16 w-16 text-muted-foreground/30 mb-3" />
          <span className="text-base font-bold">Nenhum álbum encontrado</span>
          <span className="text-xs text-center max-w-[300px] mt-1">
            Crie um novo álbum clicando no botão "Novo Álbum" no canto superior.
          </span>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedAlbums.map((album) => {
              const isSelected = selectedAlbumIds.includes(album.id);
              const photosCount = album.evidence_photos?.[0]?.count || 0;

              return (
                <Card
                  key={album.id}
                  onClick={() => navigate(`/galeria/${album.id}`)}
                  className={cn(
                    "overflow-hidden cursor-pointer group bg-card/60 border border-border/80 hover:-translate-y-1 hover:shadow-lg transition duration-300 relative",
                    isSelected && "ring-2 ring-primary border-primary bg-primary/5"
                  )}
                >
                  {/* Checkbox de Seleção */}
                  <button
                    onClick={(e) => toggleSelectAlbum(album.id, e)}
                    className="absolute top-3 left-3 z-10 bg-black/60 hover:bg-black/80 text-white rounded p-1.5 transition border border-white/20"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-warning" />
                    ) : (
                      <Square className="h-4 w-4 text-white/80" />
                    )}
                  </button>

                  {/* Cover Image */}
                  <div className="relative aspect-[16/10] bg-secondary overflow-hidden border-b border-border/50">
                    {album.cover_photo_url ? (
                      <img
                        src={album.cover_photo_url}
                        alt={album.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50">
                        <ImageIcon className="h-12 w-12" />
                        <span className="text-[10px] uppercase font-bold tracking-wider mt-1">Sem Fotos</span>
                      </div>
                    )}

                    {/* Badge de quantidade de fotos */}
                    <Badge variant="secondary" className="absolute bottom-3 right-3 gap-1 opacity-90 shadow">
                      <ImageIcon className="h-3 w-3" /> {photosCount} fotos
                    </Badge>

                    {/* Badge de tipo de Álbum */}
                    <Badge
                      variant={album.action_id ? "default" : "secondary"}
                      className="absolute top-3 right-3 opacity-90 shadow text-[9px] uppercase tracking-wider"
                    >
                      {album.action_id ? "Vinculado" : "Livre"}
                    </Badge>
                  </div>

                  <CardHeader className="p-4 space-y-1">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base font-black leading-tight group-hover:text-primary transition">
                        {album.title}
                      </CardTitle>
                    </div>
                    <CardDescription className="line-clamp-2 text-xs min-h-[32px] pt-1">
                      {album.description || "Nenhuma descrição fornecida."}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="px-4 pb-4 pt-0 space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-primary" />
                      <span>Resp: {album.responsible_name || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>{album.date ? new Date(album.date).toLocaleDateString('pt-BR') : "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="h-3.5 w-3.5 text-primary" />
                      <span>Unidade: {album.units?.name || "N/A"}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Controle de Paginação */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card/30 border border-border/50 px-6 py-4 rounded-lg">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAlbums.length)} - {Math.min(currentPage * itemsPerPage, filteredAlbums.length)} de {filteredAlbums.length} álbuns
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 hover:bg-secondary/80 border-border/60 transition-colors"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? "default" : "outline"}
                    className={cn(
                      "h-8 w-8 text-xs font-bold transition-all",
                      currentPage === pageNumber 
                        ? "shadow-md hover:bg-primary/95" 
                        : "hover:bg-secondary/80 border-border/60"
                    )}
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 hover:bg-secondary/80 border-border/60 transition-colors"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Criação */}
      <CreateAlbumModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
