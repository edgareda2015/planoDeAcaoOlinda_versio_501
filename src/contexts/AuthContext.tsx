import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth as useClerkAuth, useUser, useClerk } from '@clerk/clerk-react';
import { Session, User, RealtimeChannel } from '@supabase/supabase-js';

interface Profile {
  id: string;
  role: 'admin' | 'diretor_regional' | 'diretor_unidade';
  first_name: string;
  last_name: string;
  avatar_url?: string;
  regional_id?: string;
  unit_id?: string;
  sector_id?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const fetchProfile = async (userId: string, email?: string): Promise<Profile | null> => {
    let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!profileData && !profileError) {
        console.log("Perfil não encontrado pelo ID do Clerk. Verificando perfil legado...");
        const { data: legacyProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'admin')
          .maybeSingle();

        if (legacyProfile && legacyProfile.id.length > 30) { 
          console.log("Vinculando perfil legado ao novo ID do Clerk:", userId);
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ id: userId })
            .eq('id', legacyProfile.id)
            .select()
            .single();
          
          if (!updateError) profileData = updatedProfile;
        }
      }

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Erro ao buscar perfil:', profileError);
        return null;
      }

    if (profileData && email === 'edgareda2015@gmail.com' && profileData.role !== 'admin') {
        profileData.role = 'admin';
    }

    return profileData as Profile;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded, userId, sessionId, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const signOut = async () => {
    await clerkSignOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  useEffect(() => {
    let isMounted = true;

    const loadClerkSession = async () => {
      if (!isLoaded) return;
      
      if (userId && clerkUser) {
        // Tenta obter o UUID do Supabase do metadata do Clerk, caso contrário usa o ID do Clerk
        const supabaseId = (clerkUser.publicMetadata?.supabase_id as string) || userId;
        const supabaseToken = await getToken({ template: 'supabase' });
        
        // Log temporário para debug
        if (supabaseToken) {
          try {
            const payload = JSON.parse(atob(supabaseToken.split('.')[1]));
            console.log("JWT Claims enviados ao Supabase:", payload);
          } catch(e) {}
        }
        
        // Monkey Patching: Criando um Mock da Sessão do Supabase para manter compatibilidade
        const mockSession: Session = {
          access_token: supabaseToken || '',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: '',
          user: {
            id: supabaseId,
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: clerkUser.createdAt?.toISOString() || new Date().toISOString(),
            email: clerkUser.primaryEmailAddress?.emailAddress,
          } as User
        };

        if (!isMounted) return;
        setSession(mockSession);
        setUser(mockSession.user);

        try {
            let profileData = await fetchProfile(supabaseId, clerkUser.primaryEmailAddress?.emailAddress);
            
            // Auto-Provisioning: Se o perfil não existe, criamos agora com base no Clerk
            if (!profileData && clerkUser) {
              console.log("Perfil não encontrado. Criando perfil automático para:", clerkUser.primaryEmailAddress?.emailAddress);
              const metadata = clerkUser.publicMetadata;
              const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert({
                  id: supabaseId,
                  email: clerkUser.primaryEmailAddress?.emailAddress,
                  role: (metadata?.role as Profile['role']) || 'diretor_unidade',
                  first_name: clerkUser.firstName || 'Novo',
                  last_name: clerkUser.lastName || 'Usuário',
                  regional_id: metadata?.regional_id as string || null,
                  unit_id: metadata?.unit_id as string || null,
                  ativo: true
                })
                .select()
                .maybeSingle();

              if (!insertError && newProfile) {
                profileData = newProfile as Profile;
                console.log("Perfil criado com sucesso!");
              } else {
                console.error("Erro crítico ao provisionar perfil:", insertError);
                // Fallback para não dar tela branca
                profileData = {
                  id: supabaseId,
                  role: (metadata?.role as Profile['role']) || 'diretor_unidade',
                  first_name: clerkUser.firstName || 'Novo',
                  last_name: clerkUser.lastName || 'Usuário',
                } as Profile;
              }
            }

            // Garantia para o seu usuário Admin (Edgar)
            if (clerkUser.primaryEmailAddress?.emailAddress === 'edgareda2015@gmail.com') {
              if (profileData) {
                profileData.role = 'admin';
              }
            }

            // Se o perfil existe mas o e-mail está vazio, atualizamos
            if (profileData && !profileData.email && clerkUser.primaryEmailAddress?.emailAddress) {
              console.log("Atualizando e-mail do perfil...");
              await supabase
                .from('profiles')
                .update({ email: clerkUser.primaryEmailAddress.emailAddress })
                .eq('id', supabaseId);
            }
            
            if (isMounted) setProfile(profileData);
        } catch (error) {
            console.error("Error fetching/provisioning profile during session load:", error);
            if (isMounted) setProfile(null);
        }
      } else {
        if (isMounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      }
      
      if (isMounted) setIsLoading(false);
    };

    loadClerkSession();

    return () => { isMounted = false; };
  }, [isLoaded, userId, sessionId, clerkUser, getToken]);

  // Effect for presence channel
  useEffect(() => {
    if (profile && session?.user) {
      const newChannel = supabase.channel('online-users', {
        config: { presence: { key: session.user.id } },
      });

      newChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const userEmail = session?.user?.email || clerkUser?.primaryEmailAddress?.emailAddress || 'usuario@nassau.com';
          const userName = (profile?.first_name && profile?.last_name)
            ? `${profile.first_name} ${profile.last_name}`
            : userEmail.split('@')[0];
          
          await newChannel.track({
            user: userName,
            email: userEmail,
            online_at: new Date().toISOString(),
          });
        }
      });

      setChannel(newChannel);

      return () => {
        newChannel.unsubscribe();
        setChannel(null);
      };
    } else if (channel) {
      channel.unsubscribe();
      setChannel(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, session]);

  const value = { session, user, profile, isLoading, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};