import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User, RealtimeChannel } from '@supabase/supabase-js';

interface Profile {
  id: string;
  role: 'admin' | 'user';
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, role, first_name, last_name, avatar_url')
        .eq('id', userId)
        .single();
    
    // PGRST116 means no rows found, which is a valid state (e.g., profile not created yet)
    if (error && error.code !== 'PGRST116') { 
        console.error("Error fetching profile:", error);
        return null;
    }
    return profileData as Profile;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Função para buscar a sessão e o perfil
    const loadSessionAndProfile = async (currentSession: Session | null) => {
        if (!isMounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
            try {
                const profileData = await fetchProfile(currentSession.user.id);
                if (isMounted) {
                    setProfile(profileData);
                }
            } catch (error) {
                console.error("Error fetching profile during session load:", error);
                if (isMounted) {
                    setProfile(null);
                }
            }
        } else {
            setProfile(null);
        }
        
        if (isMounted) {
            setIsLoading(false);
        }
    };

    // 1. Tenta obter a sessão imediatamente
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
        loadSessionAndProfile(initialSession);
    });

    // 2. Configura o listener para mudanças futuras
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      
      // Para eventos subsequentes, atualiza o estado e o perfil
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        loadSessionAndProfile(session);
      }
    });

    // Cleanup function
    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect for presence channel (mantido inalterado)
  useEffect(() => {
    if (profile && session?.user) {
      const newChannel = supabase.channel('online-users', {
        config: { presence: { key: session.user.id } },
      });

      newChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const userName = (profile.first_name && profile.last_name)
            ? `${profile.first_name} ${profile.last_name}`
            : session.user.email;
          
          await newChannel.track({
            user: userName,
            email: session.user.email,
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

  const value = { session, user, profile, isLoading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};