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
  { icon: ClipboardList, label: "Dashboard Apoio", id: "others", href: "/outros-setores" },
];

const staticBottomItem = { icon: Cog, label: "Gestão", id: "admin", href: "/admin" };

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
  const { profile, user } = useAuth();
  const { activeVersion, setActiveVersion } = useVersion();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(`Erro ao sair: ${error.message}`);
    } else {
      navigate('/login');
      toast.success("Você saiu da sua conta.");
    }
  };

  const matriculaItems = useMemo(() => {
    return sectors
      ?.filter((sector) => sector.type === 'matricula' && sector.name.toUpperCase() !== "ORGÂNICO")
      .map((sector) => ({
        icon: Building,
        label: sector.name,
        id: sector.id,
        href: `/setor/${slugify(sector.name)}`,
      })) || [];
  }, [sectors]);

  const coordenacaoItems = useMemo(() => {
    return sectors
      ?.filter((sector) => sector.type === 'coordenacao' && sector.name.toUpperCase() !== "ORGÂNICO")
      .map((sector) => ({
        icon: GraduationCap,
        label: sector.name,
        id: sector.id,
        href: `/setor/${slugify(sector.name)}`,
      })) || [];
  }, [sectors]);

  const administrativoItems = useMemo(() => {
    return sectors
      ?.filter((sector) => sector.type === 'administrativo' && sector.name.toUpperCase() !== "ORGÂNICO")
      .map((sector) => ({
        icon: Star,
        label: sector.name,
        id: sector.id,
        href: `/setor/${slugify(sector.name)}`,
      })) || [];
  }, [sectors]);

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
    
    // Classes para estado inativo e hover:
    // Força o texto a ser a cor de foreground (escura no modo claro)
    // Aplica o fundo de hover e garante que o texto permaneça escuro no hover
    return cn(
      buttonVariants({ variant: "ghost" }),
      baseClasses,
      "text-foreground", // Garante que o texto seja escuro por padrão
      config.hoverBg,
      "hover:text-foreground" // Garante que o texto permaneça escuro no hover
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 max-w-full">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden bg-white shadow-sm border border-border">
            <img 
              src="/uninassau-logo.png" 
              alt="UNINASSAU Logo" 
              className="w-full h-full object-contain p-1"
            />
          </div>
          <div className="overflow-hidden whitespace-nowrap">
            <h1 className="text-sm font-bold text-foreground">UNINASSAU</h1>
            <p className="text-[10px] text-muted-foreground uppercase">Olinda</p>
          </div>
        </div>
        <div className="flex-shrink-0 pl-1">
          {/* Versão do Sistema - Apenas Display decorativo */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 border border-primary/20 rounded-full shadow-sm">
            <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary tracking-tight">
              {activeVersion === 'all' || activeVersion === 'todos' ? 'Vista Geral' : activeVersion}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto">
        <nav className="space-y-1 p-4">
          {/* Main navigation (Amarelo/Warning) */}
          {staticTopItems.map((item) => (
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
                  Matrícula
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

      {/* Bottom section */}
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
              <div className="font-medium truncate">{profile.first_name} {profile.last_name}</div>
              <div className="text-muted-foreground truncate">{user?.email}</div>
            </div>
          </div>
        )}
        
        <NavLink
          to={staticBottomItem.href}
          className={({ isActive }) =>
            cn(
              buttonVariants({ variant: isActive ? "default" : "ghost" }),
              "w-full justify-start gap-3",
              isActive && "shadow-md",
              !isActive && "text-foreground hover:bg-secondary hover:text-foreground" // Garante visibilidade para o link de Gestão
            )
          }
        >
          <staticBottomItem.icon className="h-5 w-5" />
          <span>{staticBottomItem.label}</span>
        </NavLink>

        <Button variant="ghost" className="w-full justify-start gap-3 text-foreground hover:bg-secondary hover:text-foreground" onClick={handleLogout}>
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