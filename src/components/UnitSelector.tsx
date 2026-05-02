import { useUnits } from "@/hooks/useOrganization";
import { useVersion } from "@/contexts/VersionContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MapPin } from "lucide-react";

export const UnitSelector = () => {
  const { data: units, isLoading } = useUnits();
  const { activeUnitId, setActiveUnitId } = useVersion();
  const { profile } = useAuth();

  // Só mostra o seletor para administradores e diretores regionais
  if (profile?.role !== 'admin' && profile?.role !== 'diretor_regional') {
    return null;
  }

  const isAdmin = profile?.role === 'admin';
  const filteredUnits = units?.filter(u => isAdmin || u.regional_id === profile?.regional_id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando unidades...
      </div>
    );
  }

  return (
    <div className="px-4 py-2 border-b border-border bg-muted/30">
      <div className="flex items-center gap-2 mb-1.5">
        <MapPin className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Filtro de Unidade</span>
      </div>
      <Select
        value={activeUnitId}
        onValueChange={setActiveUnitId}
      >
        <SelectTrigger className="w-full h-8 text-xs bg-white">
          <SelectValue placeholder={isAdmin ? "Todas as Unidades" : "Selecione a Unidade"} />
        </SelectTrigger>
        <SelectContent>
          {isAdmin && <SelectItem value="all">Visão Global (Todas)</SelectItem>}
          {filteredUnits?.map((unit) => (
            <SelectItem key={unit.id} value={unit.id}>
              {unit.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
