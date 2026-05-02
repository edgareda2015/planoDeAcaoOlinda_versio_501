import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

type VersionContextType = {
  activeVersion: string;
  setActiveVersion: (v: string) => void;
  activeUnitId: string | 'all';
  setActiveUnitId: (u: string | 'all') => void;
};

const VersionContext = createContext<VersionContextType | undefined>(undefined);

export const VersionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  // Inicializa com 2026.1 como fallback seguro para Olinda
  const [activeVersion, setActiveVersion] = useState<string>(() => {
    const saved = localStorage.getItem('app_version');
    return (saved && saved !== 'undefined') ? saved : '2026.1';
  });
  
  const [activeUnitId, setActiveUnitId] = useState<string | 'all'>(() => {
    const saved = localStorage.getItem('app_unit_id');
    return (saved && saved !== 'undefined') ? saved : 'all';
  });
  
  const isInitialized = useRef(false);

  // Sincronização agressiva com o banco
  useEffect(() => {
    const fetchDefaultSettings = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'default_semester')
          .maybeSingle();

        if (data?.value) {
          console.log("Semestre padrão do banco:", data.value);
          // Se é a primeira vez ou se o valor global mudou, forçamos a atualização
          if (!isInitialized.current) {
            setActiveVersion(data.value);
            isInitialized.current = true;
          }
        }
      } catch (err) {
        console.error('Erro ao buscar configurações globais:', err);
      }
    };

    fetchDefaultSettings();

    const channel = supabase
      .channel('global-settings-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
          filter: 'key=eq.default_semester'
        },
        (payload) => {
          const newValue = (payload.new as any)?.value;
          if (newValue) {
            console.log("Mudança em tempo real detectada:", newValue);
            setActiveVersion(newValue);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Restringe unidade baseado no Role
  useEffect(() => {
    if (profile) {
      if (profile.role === 'diretor_unidade') {
        if (profile.unit_id && activeUnitId !== profile.unit_id) {
          console.log(`Forçando unidade ${profile.unit_id} para role ${profile.role}`);
          setActiveUnitId(profile.unit_id);
        }
      }
    }
  }, [profile, activeUnitId]);

  useEffect(() => {
    if (activeVersion) localStorage.setItem('app_version', activeVersion);
    if (activeUnitId) localStorage.setItem('app_unit_id', activeUnitId);
    
    // Debug no console para o usuário
    console.log(`Estado Global -> Semestre: ${activeVersion}, Unidade: ${activeUnitId}`);

    let primaryColor = '221 83% 53%'; 

    if (activeVersion !== 'all' && activeVersion !== 'todos') {
      const versionNum = parseInt(activeVersion.replace(/[^0-9]/g, '')) || 1;
      const h = (versionNum * 137.508) % 360;
      primaryColor = `${Math.floor(h)} 83% 53%`; 
    }

    const root = document.documentElement;
    root.style.setProperty('--primary', primaryColor);
    root.style.setProperty('--ring', primaryColor);
    
    const [h, s, l] = primaryColor.split(' ');
    const lNumeric = parseInt(l.replace('%', ''));
    const glowL = `${Math.min(lNumeric + 10, 100)}%`;
    const secondaryColor = `${h} ${s} ${glowL}`;
    
    root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${primaryColor}) 0%, hsl(${secondaryColor}) 100%)`);
    root.style.setProperty('--primary-glow', secondaryColor);

  }, [activeVersion, activeUnitId]);

  return (
    <VersionContext.Provider value={{ activeVersion, setActiveVersion, activeUnitId, setActiveUnitId }}>
      {children}
    </VersionContext.Provider>
  );
};

export const useVersion = () => {
  const context = useContext(VersionContext);
  if (context === undefined) {
    throw new Error('useVersion must be used within a VersionProvider');
  }
  return context;
};
