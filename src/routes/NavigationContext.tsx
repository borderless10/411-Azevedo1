import { perfMark, perfMeasure } from "../utils/perfMarks";
import { setWatchdogScreen } from "../services/sessionWatchdog";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";

export type ScreenName =
  | "Login"
  | "Register"
  | "Home"
  | "AddIncome"
  | "EditIncome"
  | "IncomeList"
  | "TrackedIncome"
  | "AddExpense"
  | "EditExpense"
  | "ExpenseList"
  | "Dashboard"
  | "Profile"
  | "PublicGamificationProfile"
  | "Settings"
  | "ConsumoModerado"
  | "Feed"
  | "Chat"
  | "Metas"
  | "Wishlist"
  | "Investments"
  | "Recomendacao"
  | "Ranking"
  | "BadgeHolders"
  | "BadgeManagement"
  | "ClientPlanning"
  | "ClientInvestments"
  | "ClientInvestmentsView"
  | "ClientDetail"
  | "ClientExpenseRecords"
  | "ClientIncomeRecords"
  | "ClientList"
  | "ConsultorHome"
  | "PlanningView"
  | "Budget"
  | "CategoryBudget"
  | "Bills"
  | "CadastrarCliente"
  | "AdminUsers"
  | "EditUser"
  | "Cartoes"
  | "ConsultationScheduling"
  | "ClientInstallments"
  | "InstallmentPurchases"
  | "UserNotes"
  | "ShoppingList";

export interface NavigationEntry {
  screen: ScreenName;
  params?: any;
}

interface NavigationContextType {
  currentScreen: ScreenName;
  navigate: (screen: ScreenName, params?: any) => void;
  goBack: () => boolean;
  canGoBack: boolean;
  params?: any;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined,
);

const MAX_HISTORY_LENGTH = 50;
const AUTH_SCREENS: ScreenName[] = ["Login", "Register"];

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>("Login");
  const [params, setParams] = useState<any>(null);
  const [history, setHistory] = useState<NavigationEntry[]>([]);
  // Espelhos síncronos para navigate/goBack encadeados no mesmo tick.
  const currentEntryRef = React.useRef<NavigationEntry>({
    screen: "Login",
    params: null,
  });
  const historyRef = React.useRef<NavigationEntry[]>([]);

  const applyCurrent = useCallback((entry: NavigationEntry) => {
    currentEntryRef.current = entry;
    setParams(entry.params || null);
    setCurrentScreen(entry.screen);
  }, []);

  const applyHistory = useCallback((nextHistory: NavigationEntry[]) => {
    historyRef.current = nextHistory;
    setHistory(nextHistory);
  }, []);

  const navigate = useCallback(
    (screen: ScreenName, navigationParams?: any) => {
      perfMark("interaction.tap");
      perfMark(`nav.${screen}`);
      setWatchdogScreen(screen);

      const from = currentEntryRef.current;
      const nextEntry: NavigationEntry = {
        screen,
        params: navigationParams || null,
      };
      // Login/logout e a entrada no app após autenticar começam uma pilha
      // nova. Voltar nunca deve atravessar essa fronteira de sessão.
      const crossesAuthBoundary =
        screen === "Login" || AUTH_SCREENS.includes(from.screen);

      if (crossesAuthBoundary) {
        applyHistory([]);
      } else if (from.screen !== screen) {
        applyHistory(
          [...historyRef.current, from].slice(-MAX_HISTORY_LENGTH),
        );
      }
      // Navegar para a mesma tela só atualiza os params, sem empilhar
      // uma entrada idêntica que faria o voltar parecer sem efeito.
      applyCurrent(nextEntry);
      perfMeasure("interaction.handled", "interaction.tap");
    },
    [applyCurrent, applyHistory],
  );

  const goBack = useCallback(() => {
    const stack = historyRef.current;
    if (stack.length === 0) {
      return false;
    }
    const previous = stack[stack.length - 1];
    perfMark("interaction.tap");
    perfMark(`nav.${previous.screen}`);
    setWatchdogScreen(previous.screen);
    applyHistory(stack.slice(0, -1));
    applyCurrent(previous);
    perfMeasure("interaction.handled", "interaction.tap");
    return true;
  }, [applyCurrent, applyHistory]);

  const value = useMemo(
    () => ({
      currentScreen,
      navigate,
      goBack,
      canGoBack: history.length > 0,
      params,
    }),
    [currentScreen, navigate, goBack, history.length, params],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return context;
};
