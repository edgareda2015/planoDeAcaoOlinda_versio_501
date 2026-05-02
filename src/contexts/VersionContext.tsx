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

    // Paleta de cores mais sólidas, corporativas e elegantes (Sat: 40-70%, Lum: 35-50%)
    const professionalPalettes = [
      "222 47% 31%", // Deep Slate / Navy
      "160 50% 38%", // Forest Emerald
      "260 40% 45%", // Deep Violet
      "25 65% 45%",  // Burnt Orange
      "180 70% 30%", // Teal
      "340 55% 45%", // Crimson
      "205 60% 40%", // Steel Blue
      "45 70% 40%",  // Muted Gold
    ];

    let primaryColor = "222 47% 31%"; // Cor padrão (Navy)

    if (activeVersion !== 'all' && activeVersion !== 'todos') {
      // Cria um hash combinando a versão e a unidade para gerar uma cor única, mas sólida
      const combinedStr = `${activeVersion}-${activeUnitId}`;
      let hash = 0;
      for (let i = 0; i < combinedStr.length; i++) {
        hash = combinedStr.charCodeAt(i) + ((hash << 5) - hash);
      }
      const paletteIndex = Math.abs(hash) % professionalPalettes.length;
      primaryColor = professionalPalettes[paletteIndex];
    }

    const root = document.documentElement;
    root.style.setProperty('--primary', primaryColor);
    root.style.setProperty('--ring', primaryColor);
    
    const [h, s, l] = primaryColor.split(' ');
    const lNumeric = parseInt(l.replace('%', ''));
    const glowL = `${Math.min(lNumeric + 15, 90)}%`; // Brilho mais sutil
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
