import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { NavigationProvider } from './src/routes/NavigationContext';
import { Router } from './src/routes/Router';

/**
 * Componente principal da aplicação
 * Controle Financeiro Pessoal - MVP
 */
export default function App() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <Router />
        <StatusBar style="light" />
      </NavigationProvider>
    </AuthProvider>
  );
}
