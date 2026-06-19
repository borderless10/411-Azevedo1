/**
 * Componente de conteúdo da aplicação
 * Gerencia o StatusBar baseado no tema
 */

import React from "react";
import { StatusBar } from "expo-status-bar";
import { Router } from "../routes/Router";
import { useTheme } from "../contexts/ThemeContext";
import { ChatMessageNotifier } from "./Chat/ChatMessageNotifier";

export const AppContent = () => {
  const { isDark } = useTheme();

  return (
    <>
      <Router />
      <ChatMessageNotifier />
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
};
