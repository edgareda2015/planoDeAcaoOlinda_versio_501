import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: Array<'admin' | 'diretor_regional' | 'diretor_unidade'>;
  fallback?: ReactNode;
}

/**
 * Componente RoleGuard
 * 
 * Utilizado para proteger áreas da interface baseadas no papel (role) do usuário.
 * Exemplo de uso:
 * <RoleGuard allowedRoles={['admin']}>
 *   <AdminButton />
 * </RoleGuard>
 */
export const RoleGuard = ({ children, allowedRoles, fallback = null }: RoleGuardProps) => {
  const { profile, isLoading } = useAuth();

  // Se estiver carregando o perfil, não mostra nada (ou poderia mostrar um skeleton)
  if (isLoading) return null;

  // Se o usuário tem o perfil carregado e a role dele está na lista de permitidas
  if (profile && allowedRoles.includes(profile.role)) {
    return <>{children}</>;
  }

  // Caso contrário, retorna o fallback (por padrão null)
  return <>{fallback}</>;
};
