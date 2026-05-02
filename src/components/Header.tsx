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

  const semesters = ["2025.2", "2026.1", "2026.2"];

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-8">
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>
        
        <div className="hidden md:flex items-center gap-6">
          {profile?.role === 'diretor_unidade' && (
            <>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Unidade Atual</span>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-lg font-black text-foreground tracking-tight">{currentUnitName}</span>
                </div>
              </div>
              <div className="h-8 w-px bg-border" />
            </>
          )}
          
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Semestre</span>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-lg font-black text-foreground tracking-tight">{currentSemester}</span>
            </div>
          </div>
        </div>

        {/* Mobile View Title */}
        <div className="md:hidden flex flex-col">
           <span className="text-[9px] font-bold text-primary uppercase tracking-widest leading-none">Captação</span>
           {profile?.role === 'diretor_unidade' && (
             <span className="text-sm font-black text-foreground uppercase truncate w-32">{currentUnitName}</span>
           )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex flex-col items-end mr-2">
           <span className="text-[10px] font-bold text-muted-foreground uppercase">Status do Sistema</span>
           <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-tighter">Online</span>
           </div>
        </div>
      </div>
    </header>
  );
};

export default Header;