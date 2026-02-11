/**
 * Componente de conteúdo da aplicação
 * Gerencia o StatusBar baseado no tema
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Router } from '../routes/Router';
import { useTheme } from '../contexts/ThemeContext';

export const AppContent = () => {
  const { isDark } = useTheme();

  return (
    <>
      <Router />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
};
