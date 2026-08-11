import { Menu, GraduationCap, Building2, Calendar } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarContent } from "@/components/Sidebar";
import { NavLink } from "react-router-dom";
import { useVersion } from "@/contexts/VersionContext";
import { useUnits } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

const Header = () => {
  const { activeVersion, activeUnitId } = useVersion();
  const { data: units } = useUnits();
  const { profile } = useAuth();

  const currentUnitName = useMemo(() => {
    if (profile?.role === 'admin' && activeUnitId === 'all') return "Visão Global";
    const unit = units?.find(u => u.id === (activeUnitId || profile?.unit_id));
    return unit?.name || "Minha Unidade";
  }, [units, activeUnitId, profile]);

  const currentSemester = useMemo(() => {
    return activeVersion === 'all' || activeVersion === 'todos' ? '2026.1' : activeVersion;
  }, [activeVersion]);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 md:px-8 shadow-sm">
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden border-slate-200">
              <Menu className="h-5 w-5 text-slate-700" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-[#0B1727] border-none">
            <SidebarContent />
          </SheetContent>
        </Sheet>
        
        <div className="hidden md:flex items-center gap-4">
          {profile?.role === 'diretor_unidade' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/80 border border-slate-200/60">
              <Building2 className="h-4 w-4 text-[#0B1727]" />
              <span className="text-xs font-bold text-slate-800">{currentUnitName}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300/50">
            <Calendar className="h-4 w-4 text-amber-700" />
            <span className="text-xs font-extrabold text-amber-900">Semestre: {currentSemester}</span>
          </div>
        </div>

        {/* Mobile View Title */}
        <div className="md:hidden flex flex-col">
           <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest leading-none">UNINASSAU</span>
           <span className="text-xs font-black text-slate-900 uppercase truncate w-36">Plano de Ação</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-tight">Sistema Online</span>
        </div>
      </div>
    </header>
  );
};

export default Header;