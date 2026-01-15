import React, { createContext, useContext, useState, ReactNode } from "react";

export type ScreenName = 
  | "Login" 
  | "Register" 
  | "Home" 
  | "AddIncome"
  | "IncomeList"
  | "AddExpense"
  | "ExpenseList"
  | "Dashboard" 
  | "Profile"
  | "Settings";

interface NavigationContextType {
  currentScreen: ScreenName;
  navigate: (screen: ScreenName) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined
);

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>("Login");

  const navigate = (screen: ScreenName) => {
    console.log('🗺️ [NAVIGATION] Navegando para:', screen);
    setCurrentScreen(screen);
  };

  return (
    <NavigationContext.Provider value={{ currentScreen, navigate }}>
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