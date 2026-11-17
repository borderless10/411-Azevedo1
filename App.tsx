import React from "react";
import {
  findNodeHandle,
  Keyboard,
  TextInput,
  View,
  type GestureResponderEvent,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/contexts/AuthContext";
import { ThemeProvider } from "./src/contexts/ThemeContext";
import { ShowValuesProvider } from "./src/contexts/ShowValuesContext";
import { ChatsProvider } from "./src/contexts/ChatsContext";
import { ConsultationSchedulingProvider } from "./src/hooks/useConsultationScheduling";
import { NavigationProvider } from "./src/routes/NavigationContext";
import { Router } from "./src/routes/Router";
import { AppContent } from "./src/components/AppContent";
import { ErrorBoundary } from "./src/components/ErrorBoundary";

const dismissKeyboardUnlessInput = (event: GestureResponderEvent): boolean => {
  try {
    const state = (
      TextInput as unknown as {
        State?: {
          currentlyFocusedInput?: () =>
            | Parameters<typeof findNodeHandle>[0]
            | null;
          currentlyFocusedField?: () => number | null;
        };
      }
    ).State;
    // RN Web / algumas builds não expõem currentlyFocusedInput como função.
    // Sem esse guard, qualquer toque quebra o console e atrapalha o save.
    const focused =
      typeof state?.currentlyFocusedInput === "function"
        ? state.currentlyFocusedInput()
        : null;
    if (!focused) return false;
    const focusedTag = findNodeHandle(focused);
    if (
      focusedTag != null &&
      String(event.nativeEvent.target) === String(focusedTag)
    ) {
      return false;
    }
    Keyboard.dismiss();
  } catch {
    // ignore: foco/teclado não pode derrubar o fluxo do app
  }
  return false;
};

/**
 * Componente principal da aplicação
 * Controle Financeiro Pessoal - MVP
 */
export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SafeAreaProvider>
          <View
            style={{ flex: 1 }}
            onStartShouldSetResponderCapture={dismissKeyboardUnlessInput}
          >
          <AuthProvider>
            <ChatsProvider>
              <ConsultationSchedulingProvider>
                <ShowValuesProvider>
                  <NavigationProvider>
                    <AppContent />
                  </NavigationProvider>
                </ShowValuesProvider>
              </ConsultationSchedulingProvider>
            </ChatsProvider>
          </AuthProvider>
          </View>
        </SafeAreaProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
