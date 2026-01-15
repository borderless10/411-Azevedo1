import React from "react";
import { LoginScreen } from "../screens/Auth/LoginScreen";
import { RegisterScreen } from "../screens/Auth/RegisterScreen";
import { HomeScreen } from "../screens/Home/HomeScreen";
import { AddIncomeScreen } from "../screens/Income/AddIncomeScreen";
import { useNavigation } from "./NavigationContext";
import { useAuth } from "../hooks/useAuth";

export const Router = () => {
  const { currentScreen } = useNavigation();
  const { isAuthenticated } = useAuth();

  const renderScreen = () => {
    // Se não estiver autenticado, mostrar apenas Login/Register
    if (!isAuthenticated) {
      switch (currentScreen) {
        case "Register":
          return <RegisterScreen />;
        default:
          return <LoginScreen />;
      }
    }

    // Se autenticado, mostrar telas protegidas
    switch (currentScreen) {
      case "Home":
        return <HomeScreen />;
      case "AddIncome":
        return <AddIncomeScreen />;
      case "IncomeList":
        return <HomeScreen />; // Temporário até criar IncomeListScreen
      case "AddExpense":
        return <HomeScreen />; // Temporário até criar AddExpenseScreen
      case "ExpenseList":
        return <HomeScreen />; // Temporário até criar ExpenseListScreen
      default:
        return <HomeScreen />;
    }
  };

  return renderScreen();
};
