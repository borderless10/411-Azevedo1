import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { NavigationProvider } from './src/routes/NavigationContext';
import { Router } from './src/routes/Router';
import { AppContent } from './src/components/AppContent';

/**
 * Componente principal da aplicação
 * Controle Financeiro Pessoal - MVP
 */
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationProvider>
          <AppContent />
        </NavigationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
