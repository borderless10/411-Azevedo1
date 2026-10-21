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
  | "ConsultationScheduling";

interface NavigationContextType {
  currentScreen: ScreenName;
  navigate: (screen: ScreenName, params?: any) => void;
  params?: any;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined,
);

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>("Login");
  const [params, setParams] = useState<any>(null);

  const navigate = useCallback((screen: ScreenName, navigationParams?: any) => {
    perfMark("interaction.tap");
    perfMark(`nav.${screen}`);
    setWatchdogScreen(screen);
    setParams(navigationParams || null);
    setCurrentScreen(screen);
    perfMeasure("interaction.handled", "interaction.tap");
  }, []);

  const value = useMemo(
    () => ({ currentScreen, navigate, params }),
    [currentScreen, navigate, params],
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
