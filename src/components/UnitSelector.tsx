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
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

export const UnitSelector = () => {
  const { data: units, isLoading } = useUnits();
  const { activeUnitId, setActiveUnitId } = useVersion();
  const { profile } = useAuth();
  const location = useLocation();

  // Só mostra o seletor para administradores e diretores regionais
  if (profile?.role !== 'admin' && profile?.role !== 'diretor_regional') {
    return null;
  }

  const isAdmin = profile?.role === 'admin';
  const filteredUnits = units?.filter(u => isAdmin || u.regional_id === profile?.regional_id);

  const isDashboardDeAcoes = location.pathname === '/outros-setores';

  useEffect(() => {
    if (!isDashboardDeAcoes && activeUnitId === 'all' && filteredUnits && filteredUnits.length > 0) {
      setActiveUnitId(filteredUnits[0].id);
    }
  }, [isDashboardDeAcoes, activeUnitId, filteredUnits, setActiveUnitId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando unidades...
      </div>
    );
  }

  return (
    <div className="p-2.5 rounded-xl border border-white/10 bg-[#132238]/80 backdrop-blur-sm shadow-inner my-1">
      <div className="flex items-center gap-1.5 mb-1.5">
        <MapPin className="h-3 w-3 text-[#D4AF37]" />
        <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Unidade Ativa</span>
      </div>
      <Select
        value={activeUnitId}
        onValueChange={setActiveUnitId}
      >
        <SelectTrigger className="w-full h-8 text-xs bg-[#0B1727] text-white border-white/20 hover:border-amber-400/50 focus:ring-amber-400">
          <SelectValue placeholder={isAdmin ? "Todas as Unidades" : "Selecione a Unidade"} />
        </SelectTrigger>
        <SelectContent className="bg-[#0B1727] text-white border-slate-700">
          {isAdmin && isDashboardDeAcoes && <SelectItem value="all" className="focus:bg-white/10 focus:text-white">Visão Global (Todas)</SelectItem>}
          {filteredUnits?.map((unit) => (
            <SelectItem key={unit.id} value={unit.id} className="focus:bg-white/10 focus:text-white">
              {unit.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

