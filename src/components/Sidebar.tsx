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
  Image,
  CreditCard,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { slugify } from "@/lib/utils";
import { useSectors } from "@/hooks/useGoals";
import { useAuth } from "@/contexts/AuthContext";
import { useVersion } from "@/contexts/VersionContext";
import { useUnits } from "@/hooks/useOrganization";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useHasExpenseAccess } from "@/hooks/useExpenseAccess";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UnitSelector } from "@/components/UnitSelector";

const staticTopItems = [
  { icon: FileText, label: "Ações", id: "actions", href: "/" },
  { icon: CreditCard, label: "Cartão de Despesa", id: "expenses", href: "/despesas" },
  { icon: Target, label: "Metas", id: "goals", href: "/metas" },
  { icon: CalendarDays, label: "Dia a Dia", id: "daily", href: "/dia-a-dia" },
  { icon: CalendarRange, label: "Mês a Mês", id: "monthly", href: "/mes-a-mes" },
  { icon: Link, label: "Links Úteis", id: "links", href: "/links-uteis" },
  { icon: Image, label: "Galeria de Evidências", id: "gallery", href: "/galeria" },
  { icon: BarChart3, label: "Dashboard", id: "dashboard", href: "/dashboard" },
  { icon: ClipboardList, label: "Dashboard de Ações", id: "regional-dashboard", href: "/outros-setores" },
];

const staticBottomItem = { icon: Cog, label: "Gestão", id: "admin", href: "/admin" };

export const SidebarContent = () => {
  const { data: sectors, isLoading } = useSectors();
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: hasExpenseAccess } = useHasExpenseAccess();

  const userInitials = useMemo(() => {
    if (!profile?.first_name) return "AD";
    const first = profile.first_name.charAt(0).toUpperCase();
    const last = profile.last_name ? profile.last_name.charAt(0).toUpperCase() : "";
    return `${first}${last}`;
  }, [profile]);

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
        icon: Users,
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

  const renderNavLink = (item: { icon: any; label: string; href: string }, exact = false) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.href}
        to={item.href}
        end={exact}
        className={({ isActive }) =>
          cn(
            "flex items-center justify-between w-full px-3.5 py-2.5 my-0.5 rounded-xl text-xs font-semibold transition-all duration-150 group",
            isActive
              ? "bg-[#D4AF37] text-[#0B1727] font-bold shadow-md shadow-amber-500/10"
              : "text-slate-300 hover:text-white hover:bg-white/10"
          )
        }
      >
        {({ isActive }) => (
          <>
            <div className="flex items-center gap-3 truncate">
              <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-[#0B1727]" : "text-slate-400 group-hover:text-amber-400")} />
              <span className="truncate">{item.label}</span>
            </div>
            {isActive && <ChevronRight className="h-4 w-4 text-[#0B1727] shrink-0" />}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <div className="flex h-full flex-col bg-[#0B1727] text-white">
      {/* Header Institucional da Sidebar */}
      <div className="flex items-center gap-3 p-5 border-b border-white/10 bg-[#081220]">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-md border border-amber-400/30 overflow-hidden shrink-0">
          <img 
            src="/uninassau-logo.png" 
            alt="UNINASSAU Logo" 
            className="w-full h-full object-contain p-1"
          />
        </div>
        <div className="flex flex-col min-w-0">
          <h1 className="text-sm font-black text-white uppercase tracking-tight truncate">
            Plano de Ação
          </h1>
          <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-[0.2em]">
            UNINASSAU
          </span>
        </div>
      </div>

      <RoleGuard allowedRoles={['admin', 'diretor_regional']}>
        <div className="px-3 pt-3">
          <UnitSelector />
        </div>
      </RoleGuard>

      {/* Lista de Navegação com Scrollbar customizada */}
      <div className="flex-grow overflow-y-auto custom-scrollbar px-3 py-3 space-y-1">
        {/* Subtítulo de Operação / Navegação Principal */}
        <div className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-[#D4AF37]/80">
          OPERAÇÃO & NAVEGAÇÃO
        </div>

        {staticTopItems
          .filter(item => {
            if (item.id === 'regional-dashboard') {
              return profile?.role === 'admin' || profile?.role === 'diretor_regional';
            }
            if (item.id === 'expenses') {
              return hasExpenseAccess === true;
            }
            return true;
          })
          .map((item) => renderNavLink(item, item.href === "/"))}

        <Accordion type="multiple" defaultValue={["matricula", "coordenacao", "administrativo"]} className="w-full pt-2">
          {/* Matrícula (Comercial / QG) */}
          {matriculaItems.length > 0 && (
            <AccordionItem value="matricula" className="border-none my-1">
              <AccordionTrigger className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#D4AF37] hover:no-underline rounded-lg transition-colors">
                COMERCIAL / QG
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-0 pl-1 space-y-0.5">
                {matriculaItems.map((item) => renderNavLink(item))}
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Coordenação */}
          {coordenacaoItems.length > 0 && (
            <AccordionItem value="coordenacao" className="border-none my-1">
              <AccordionTrigger className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#D4AF37] hover:no-underline rounded-lg transition-colors">
                COORDENAÇÃO
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-0 pl-1 space-y-0.5">
                {coordenacaoItems.map((item) => renderNavLink(item))}
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Ritual de Gestão */}
          {administrativoItems.length > 0 && (
            <AccordionItem value="administrativo" className="border-none my-1">
              <AccordionTrigger className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#D4AF37] hover:no-underline rounded-lg transition-colors">
                RITUAL DE GESTÃO
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-0 pl-1 space-y-0.5">
                {administrativoItems.map((item) => renderNavLink(item))}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {isLoading && (
          <div className="flex items-center justify-center p-3 text-xs text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#D4AF37]" />
            Carregando setores...
          </div>
        )}
      </div>

      {/* Seção Inferior: Gestão (se autorizado) + Card de Usuário */}
      <div className="border-t border-white/10 p-3 space-y-2 bg-[#081220]">
        <RoleGuard allowedRoles={['admin', 'diretor_unidade', 'diretor_regional']}>
          {renderNavLink(staticBottomItem)}
        </RoleGuard>

        {/* Card do Usuário (Inspirado no Modelo Medicina UNINASSAU) */}
        {profile && (
          <div className="flex items-center justify-between rounded-xl bg-[#132238] border border-white/10 p-2.5 shadow-inner">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-full bg-[#D4AF37] text-[#0B1727] font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm">
                {userInitials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate leading-tight">
                  {profile?.first_name || 'Administrador'} {profile?.last_name || ''}
                </span>
                <span className="text-[10px] text-slate-400 truncate leading-tight">
                  {user?.primaryEmailAddress?.emailAddress || profile?.email || 'usuario@uninassau.edu.br'}
                </span>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              title="Sair"
              className="p-1.5 text-slate-400 hover:text-[#D4AF37] hover:bg-white/10 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const Sidebar = () => {
  return (
    <aside className="hidden bg-[#0B1727] md:fixed md:inset-y-0 md:left-0 md:z-20 md:block md:w-64 md:border-r md:border-white/10 shadow-xl">
      <SidebarContent />
    </aside>
  );
};