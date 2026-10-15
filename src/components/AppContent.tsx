/**
 * Componente de conteúdo da aplicação
 * Gerencia o StatusBar baseado no tema
 */

import React from "react";
import { StatusBar } from "expo-status-bar";
import { Router } from "../routes/Router";
import { useTheme } from "../contexts/ThemeContext";
import { ChatMessageNotifier } from "./Chat/ChatMessageNotifier";
import { CycleConsultationNotifier } from "./Consultation/CycleConsultationNotifier";
import { PushBootstrap } from "./Notifications/PushBootstrap";
import { WebAlertHost } from "./Web/WebAlertHost";
import { WebDesktopCss } from "./Web/WebDesktopCss";

export const AppContent = () => {
  const { isDark } = useTheme();

  return (
    <>
      <WebDesktopCss />
      <Router />
      <PushBootstrap />
      <ChatMessageNotifier />
      <CycleConsultationNotifier />
      <WebAlertHost />
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
};
