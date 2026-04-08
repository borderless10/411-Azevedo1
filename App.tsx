import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/contexts/AuthContext";
import { ThemeProvider } from "./src/contexts/ThemeContext";
import { ShowValuesProvider } from "./src/contexts/ShowValuesContext";
import { NavigationProvider } from "./src/routes/NavigationContext";
import { Router } from "./src/routes/Router";
import { AppContent } from "./src/components/AppContent";

/**
 * Componente principal da aplicação
 * Controle Financeiro Pessoal - MVP
 */
export default function App() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <ShowValuesProvider>
            <NavigationProvider>
              <AppContent />
            </NavigationProvider>
          </ShowValuesProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
