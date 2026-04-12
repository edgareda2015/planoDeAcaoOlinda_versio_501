import {
  DollarSign,
  GraduationCap,
  Building2,
  Megaphone,
  Users,
  BookOpen,
  Briefcase,
  ClipboardList,
  Target,
  LucideIcon,
  RefreshCw,
  Star,
} from "lucide-react";

// --- Icon Mapping ---
const sectorIconMap: Record<string, LucideIcon> = {
  FIES: DollarSign,
  PROUNI: GraduationCap,
  COMERCIAL: Building2,
  MARKETING: Megaphone,
  REINGRESSO: Users,
  REMATRÍCULA: RefreshCw,
  "EAD/PÓS": BookOpen,
  EAD: BookOpen,
  PÓS: BookOpen,
  QG: Briefcase,
  "CRA/RETENÇÃO": ClipboardList,
  CRA: ClipboardList,
  ADMINISTRATIVO: Star, // Adicionando ícone para Administrativo
};

export const getSectorIcon = (sectorName: string): LucideIcon => {
  return sectorIconMap[sectorName.toUpperCase()] || Target;
};

// --- Color Mapping ---
interface SectorColors {
  card: { bg: string; text: string };
  chart: string;
  header: { bg: string; hover: string };
}

// Helper function to create consistent color sets from Tailwind classes
const createColorSet = (name: string, chartHex: string) => ({
  card: { bg: `bg-${name}-100`, text: `text-${name}-800` },
  chart: chartHex,
  header: { bg: `bg-${name}-600`, hover: `hover:bg-${name}-700` },
});

// Define a unique color for each sector
const sectorColorMap: Record<string, SectorColors> = {
  // Cores específicas de setores
  COMERCIAL: createColorSet("sky", "#0ea5e9"),       // Light Blue
  MARKETING: createColorSet("sky", "#0ea5e9"),     // MKT (Matrícula) usando cor azul
  FIES: createColorSet("emerald", "#10b981"),       // Green
  PROUNI: createColorSet("violet", "#8b5cf6"),      // Violet
  REINGRESSO: createColorSet("amber", "#f59e0b"),   // Amber/Yellow
  REMATRÍCULA: createColorSet("orange", "#f97316"), // Orange
  EAD: createColorSet("indigo", "#6366f1"),         // Indigo
  PÓS: createColorSet("cyan", "#06b6d4"),           // Cyan
  QG: createColorSet("rose", "#f43f5e"),             // Rose
  CRA: createColorSet("teal", "#14b8a6"),            // Teal
  // Aliases for compatibility
  "EAD/PÓS": createColorSet("indigo", "#6366f1"),
  "CRA/RETENÇÃO": createColorSet("teal", "#14b8a6"),
  
  // Cores padrão baseadas nos tipos de setor (para setores não mapeados acima)
  MATRICULA_DEFAULT: createColorSet("blue", "#3b82f6"), // Azul (Primary)
  COORDENACAO_DEFAULT: createColorSet("green", "#10b981"), // Verde (Accent)
  ADMINISTRATIVO_DEFAULT: createColorSet("violet", "#8b5cf6"), // Roxo (Violet)

  default: createColorSet("gray", "#6b7280"),
};

export const getSectorColors = (sectorName: string): SectorColors => {
  const upperCaseName = sectorName.toUpperCase();
  
  // 1. Tenta encontrar a cor pelo nome exato do setor
  if (sectorColorMap[upperCaseName]) {
    return sectorColorMap[upperCaseName];
  }

  // Se o setor não estiver mapeado, ele usará o default.
  return sectorColorMap.default;
};