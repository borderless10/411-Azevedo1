import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppRoutes } from './src/routes/AppRoutes';

/**
 * Componente principal da aplicação
 * Controle Financeiro Pessoal - MVP
 */
export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
