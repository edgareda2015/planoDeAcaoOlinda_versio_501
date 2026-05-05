import { NavLink, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import {
  BarChart3,
  Target,
  FileText,
  Cog,
  Loader2,
  CalendarDays,
  CalendarRange,
  Link,
  ClipboardList,
  LogOut,
  User,
  Users,
  Building,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { slugify } from "@/lib/utils";
import { buttonVariants, Button } from "@/components/ui/button";
import { useSectors } from "@/hooks/useGoals";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useVersion } from "@/contexts/VersionContext";
import { useUnits } from "@/hooks/useOrganization";
import { RoleGuard } from "@/components/auth/RoleGuard";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const staticTopItems = [
  { icon: FileText, label: "Ações", id: "actions", href: "/" },
  { icon: Target, label: "Metas", id: "goals", href: "/metas" },
  { icon: CalendarDays, label: "Dia a Dia", id: "daily", href: "/dia-a-dia" },
  { icon: CalendarRange, label: "Mês a Mês", id: "monthly", href: "/mes-a-mes" },
  { icon: Link, label: "Links Úteis", id: "links", href: "/links-uteis" },
  { icon: BarChart3, label: "Dashboard", id: "dashboard", href: "/dashboard" },
  { icon: ClipboardList, label: "Dashboard de Ações", id: "regional-dashboard", href: "/outros-setores" },
];

const staticBottomItem = { icon: Cog, label: "Gestão", id: "admin", href: "/admin" };

import { UnitSelector } from "@/components/UnitSelector";

// Configuração de cores para os grupos
const colorConfig = {
  main: {
    activeBg: "bg-warning/80",
    activeText: "text-warning-foreground",
    hoverBg: "hover:bg-warning/20",
  },
  matricula: {
    activeBg: "bg-primary",
    activeText: "text-primary-foreground",
    hoverBg: "hover:bg-primary/20",
  },
  coordenacao: {
    activeBg: "bg-accent",
    activeText: "text-accent-foreground",
    hoverBg: "hover:bg-accent/20",
  },
  administrativo: {
    activeBg: "bg-violet-600", // Roxo
    activeText: "text-white",
    hoverBg: "hover:bg-violet-600/20",
  },
};

export const SidebarContent = () => {
  const { data: sectors, isLoading } = useSectors();
  const { data: units } = useUnits();
  const { profile, user, signOut } = useAuth();
  const { activeVersion, activeUnitId } = useVersion();
  const navigate = useNavigate();

  const currentUnitName = useMemo(() => {
    if (profile?.role === 'admin' && activeUnitId === 'all') return "Visão Global";
    const unit = units?.find(u => u.id === (activeUnitId || profile?.unit_id));
    return unit?.name || "Minha Unidade";
  }, [units, activeUnitId, profile]);

  const currentSemester = useMemo(() => {
    return activeVersion === 'all' || activeVersion === 'todos' ? '2026.1' : activeVersion;
  }, [activeVersion]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
      toast.success("Você saiu da sua conta.");
    } catch (error: any) {
      toast.error(`Erro ao sair: ${error.message}`);
    }
  };

  const matriculaItems = useMemo(() => {
    return sectors
      ?.filter((sector) => {
        const isType = sector.type === 'matricula';
        const isNotOrganico = sector.name.toUpperCase() !== "ORGÂNICO";
        const isAllowed = true; // Removida filtragem por coordenador
        return isType && isNotOrganico && isAllowed;
      })
      .map((sector) => ({
        icon: Building,
        label: sector.name,
        id: sector.id,
        href: `/setor/${slugify(sector.name)}`,
      })) || [];
  }, [sectors, profile]);

  const coordenacaoItems = useMemo(() => {
    return sectors
      ?.filter((sector) => {
        const isType = sector.type === 'coordenacao';
        const isNotOrganico = sector.name.toUpperCase() !== "ORGÂNICO";
        const isAllowed = true; // Removida filtragem por coordenador
        return isType && isNotOrganico && isAllowed;
      })
      .map((sector) => ({
        icon: Users,
        label: sector.name,
        id: sector.id,
        href: `/setor/${slugify(sector.name)}`,
      })) || [];
  }, [sectors, profile]);

  const administrativoItems = useMemo(() => {
    return sectors
      ?.filter((sector) => {
        const isType = sector.type === 'administrativo';
        const isNotOrganico = sector.name.toUpperCase() !== "ORGÂNICO";
        const isAllowed = true; // Removida filtragem por coordenador
        return isType && isNotOrganico && isAllowed;
      })
      .map((sector) => ({
        icon: Star,
        label: sector.name,
        id: sector.id,
        href: `/setor/${slugify(sector.name)}`,
      })) || [];
  }, [sectors, profile]);

  // Função auxiliar para aplicar classes de link
  const getLinkClasses = (isActive: boolean, config: typeof colorConfig.main) => {
    const baseClasses = "w-full justify-start gap-3";
    
    if (isActive) {
      return cn(
        buttonVariants({ variant: "ghost" }),
        baseClasses,
        config.activeBg,
        config.activeText,
        "shadow-md",
      );
    }
    
    return cn(
      buttonVariants({ variant: "ghost" }),
      baseClasses,
      "text-foreground",
      config.hoverBg,
      "hover:text-foreground"
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-4 p-6 border-b border-border bg-gradient-to-b from-background to-secondary/20">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md border border-border overflow-hidden">
              <img 
                src="/uninassau-logo.png" 
                alt="UNINASSAU Logo" 
                className="w-full h-full object-contain p-1.5"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-black text-foreground uppercase tracking-tighter leading-none">
                Plano de Ação
              </h1>
              <p className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] mt-1">
                Captação
              </p>
            </div>
          </div>
        </div>
      </div>

      <RoleGuard allowedRoles={['admin', 'diretor_regional']}>
        <UnitSelector />
      </RoleGuard>

      <div className="flex-grow overflow-y-auto">
        <nav className="space-y-1 p-4">
          {/* Main navigation (Amarelo/Warning) */}
          {staticTopItems
            .filter(item => {
              if (item.id === 'regional-dashboard') {
                return profile?.role === 'admin' || profile?.role === 'diretor_regional';
              }
              return true;
            })
            .map((item) => (
            <NavLink
              key={item.id}
              to={item.href}
              end={item.href === "/"}
              className={({ isActive }) => getLinkClasses(isActive, colorConfig.main)}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}

          <Accordion type="multiple" defaultValue={["matricula", "coordenacao", "administrativo"]} className="w-full">
            {/* Matrícula (Azul/Primary) */}
            {matriculaItems.length > 0 && (
              <AccordionItem value="matricula" className="border-none">
                <AccordionTrigger className={cn(
                  "rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wider hover:no-underline mt-4",
                  colorConfig.matricula.activeBg,
                  colorConfig.matricula.activeText
                )}>
                  Comercial / QG
                </AccordionTrigger>
                <AccordionContent className="pt-1">
                  {matriculaItems.map((item) => (
                    <NavLink
                      key={item.id}
                      to={item.href}
                      className={({ isActive }) => getLinkClasses(isActive, colorConfig.matricula)}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Coordenação (Verde/Accent) */}
            {coordenacaoItems.length > 0 && (
              <AccordionItem value="coordenacao" className="border-none">
                <AccordionTrigger className={cn(
                  "rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wider hover:no-underline mt-4",
                  colorConfig.coordenacao.activeBg,
                  colorConfig.coordenacao.activeText
                )}>
                  Coordenação
                </AccordionTrigger>
                <AccordionContent className="pt-1">
                  {coordenacaoItems.map((item) => (
                    <NavLink
                      key={item.id}
                      to={item.href}
                      className={({ isActive }) => getLinkClasses(isActive, colorConfig.coordenacao)}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Ritual de Gestão (Administrativo) (Roxo/Violet) */}
            {administrativoItems.length > 0 && (
              <AccordionItem value="administrativo" className="border-none">
                <AccordionTrigger className={cn(
                  "rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wider hover:no-underline mt-4",
                  colorConfig.administrativo.activeBg,
                  colorConfig.administrativo.activeText
                )}>
                  Ritual de Gestão
                </AccordionTrigger>
                <AccordionContent className="pt-1">
                  {administrativoItems.map((item) => (
                    <NavLink
                      key={item.id}
                      to={item.href}
                      className={({ isActive }) => getLinkClasses(isActive, colorConfig.administrativo)}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>

          {isLoading && (
            <div className="flex items-center justify-center p-2 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando...
            </div>
          )}
        </nav>
      </div>

      {/* Seção inferior com Perfil e Logout */}
      <div className="border-t p-4 space-y-2">
        {profile && (
          <div className="flex items-center gap-3 rounded-md p-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="grid gap-0.5 text-xs overflow-hidden">
              <div className="font-medium truncate">{profile?.first_name || 'Usuário'} {profile?.last_name || ''}</div>
              <div className="text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</div>
            </div>
          </div>
        )}
        
        <RoleGuard allowedRoles={['admin', 'diretor_unidade', 'diretor_regional']}>
          <NavLink
            to={staticBottomItem.href}
            className={({ isActive }) =>
              cn(
                buttonVariants({ variant: isActive ? "default" : "ghost" }),
                "w-full justify-start gap-3",
                isActive && "shadow-md",
                !isActive && "text-foreground hover:bg-secondary hover:text-foreground"
              )
            }
          >
            <staticBottomItem.icon className="h-5 w-5" />
            <span>{staticBottomItem.label}</span>
          </NavLink>
        </RoleGuard>

        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-foreground hover:bg-secondary hover:text-foreground" 
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </Button>
      </div>
    </div>
  );
};

export const Sidebar = () => {
  return (
    <aside className="hidden bg-card md:fixed md:inset-y-0 md:left-0 md:z-10 md:block md:w-64 md:border-r">
      <SidebarContent />
    </aside>
  );
};