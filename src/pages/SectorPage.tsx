import { useParams } from "react-router-dom";
import { SectorDashboard } from "@/components/SectorDashboard";
import { useSectors } from "@/hooks/useGoals";
import { slugify } from "@/lib/utils";
import { Loader2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

const SectorPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: sectors, isLoading, isError } = useSectors();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !sectors) {
    return (
      <Card className="p-6 text-destructive flex items-center justify-center min-h-[400px]">
        <XCircle className="h-5 w-5 mr-2" />
        Erro ao buscar a lista de setores.
      </Card>
    );
  }

  const currentSector = sectors.find(sector => slugify(sector.name) === slug);

  if (!currentSector) {
    return (
      <Card className="p-6 text-destructive flex items-center justify-center min-h-[400px]">
        <XCircle className="h-5 w-5 mr-2" />
        Setor "{slug}" não encontrado no banco de dados.
      </Card>
    );
  }

  return <SectorDashboard sectorId={currentSector.id} sectorName={currentSector.name} sectorType={currentSector.type} />;
};

export default SectorPage;