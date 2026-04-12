import React, { createContext, useContext, useState, useEffect } from 'react';

type VersionContextType = {
  activeVersion: string;
  setActiveVersion: (v: string) => void;
};

const VersionContext = createContext<VersionContextType | undefined>(undefined);

export const VersionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeVersion, setActiveVersion] = useState<string>(() => {
    return localStorage.getItem('app_version') || '2026.1';
  });

  useEffect(() => {
    localStorage.setItem('app_version', activeVersion);
    
    let primaryColor = '221 83% 53%'; // Azul padrão

    if (activeVersion !== 'all' && activeVersion !== 'todos') {
      // Extraímos apenas os números (ex: 2026.1 vira 20261)
      const versionNum = parseInt(activeVersion.replace(/[^0-9]/g, '')) || 1;
      
      // Técnica do Ângulo de Ouro (Golden Angle: ~137.508°)
      // Isso garante uma distribuição máxima de cores para itens sequenciais no círculo cromático
      const h = (versionNum * 137.508) % 360;
      
      // Mantemos Saturação e Brilho constantes para manter a identidade visual do sistema
      primaryColor = `${Math.floor(h)} 83% 53%`; 
    }

    // Atualiza as variáveis CSS no :root
    const root = document.documentElement;
    root.style.setProperty('--primary', primaryColor);
    root.style.setProperty('--ring', primaryColor);
    
    // Cálculo do Glow (degradê)
    const [h, s, l] = primaryColor.split(' ');
    const lNumeric = parseInt(l.replace('%', ''));
    const glowL = `${Math.min(lNumeric + 10, 100)}%`;
    const secondaryColor = `${h} ${s} ${glowL}`;
    
    root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${primaryColor}) 0%, hsl(${secondaryColor}) 100%)`);
    root.style.setProperty('--primary-glow', secondaryColor);

  }, [activeVersion]);

  return (
    <VersionContext.Provider value={{ activeVersion, setActiveVersion }}>
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
