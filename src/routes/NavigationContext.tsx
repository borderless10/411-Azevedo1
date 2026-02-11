import React, { createContext, useContext, useState, ReactNode } from "react";

export type ScreenName = 
  | "Login" 
  | "Register" 
  | "Home" 
  | "AddIncome"
  | "EditIncome"
  | "IncomeList"
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
  | "Recomendacao"
  | "Budget"
  | "Bills"
  | "CadastrarCliente";

interface NavigationContextType {
  currentScreen: ScreenName;
  navigate: (screen: ScreenName, params?: any) => void;
  params?: any;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined
);

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>("Login");
  const [params, setParams] = useState<any>(null);

  const navigate = (screen: ScreenName, navigationParams?: any) => {
    console.log('🗺️ [NAVIGATION] Navegando para:', screen, navigationParams ? 'com params' : '');
    setParams(navigationParams || null);
    setCurrentScreen(screen);
  };

  return (
    <NavigationContext.Provider value={{ currentScreen, navigate, params }}>
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