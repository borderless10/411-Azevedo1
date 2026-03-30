/**
 * Componente de conteúdo da aplicação
 * Gerencia o StatusBar baseado no tema
 */

import React from "react";
import { StatusBar } from "expo-status-bar";
import { Router } from "../routes/Router";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { creditCardServices } from "../services/creditCardServices";

export const AppContent = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();

  React.useEffect(() => {
    if (!user?.id) return;

    // Disparo idempotente: gera pagamento automático de fatura no vencimento quando necessário.
    void creditCardServices.runAutoDebitForUser(user.id).catch((error) => {
      if (__DEV__) {
        console.log("Erro ao processar débito automático de faturas:", error);
      }
    });
  }, [user?.id]);

  return (
    <>
      <Router />
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
};
