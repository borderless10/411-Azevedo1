/**
 * Componente de conteúdo da aplicação
 * Gerencia o StatusBar baseado no tema
 */

import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import {
  startSessionWatchdog,
  stopSessionWatchdog,
} from "../services/sessionWatchdog";
import { Router } from "../routes/Router";
import { useTheme } from "../contexts/ThemeContext";
import { ChatMessageNotifier } from "./Chat/ChatMessageNotifier";
import { CycleConsultationNotifier } from "./Consultation/CycleConsultationNotifier";
import { PushBootstrap } from "./Notifications/PushBootstrap";
import { WebAlertHost } from "./Web/WebAlertHost";
import { WebDesktopCss } from "./Web/WebDesktopCss";
import { DevToolsMenu } from "./Dev/DevToolsMenu";

export const AppContent = () => {
  const { isDark } = useTheme();

  useEffect(() => {
    void startSessionWatchdog();
    return () => stopSessionWatchdog();
  }, []);

  return (
    <>
      <WebDesktopCss />
      <Router />
      <PushBootstrap />
      <ChatMessageNotifier />
      <CycleConsultationNotifier />
      <WebAlertHost />
      <DevToolsMenu />
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
};
