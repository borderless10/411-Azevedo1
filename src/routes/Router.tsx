import React, { useEffect } from "react";
import { LoginScreen } from "../screens/Auth/LoginScreen";
import { RegisterScreen } from "../screens/Auth/RegisterScreen";
import { HomeScreen } from "../screens/Home/HomeScreen";
import { AddIncomeScreen } from "../screens/Income/AddIncomeScreen";
import { EditIncomeScreen } from "../screens/Income/EditIncomeScreen";
import { IncomeListScreen } from "../screens/Income/IncomeListScreen";
import { AddExpenseScreen } from "../screens/Expense/AddExpenseScreen";
import { EditExpenseScreen } from "../screens/Expense/EditExpenseScreen";
import { ExpenseListScreen } from "../screens/Expense/ExpenseListScreen";
import { useNavigation } from "./NavigationContext";
import { useAuth } from "../hooks/useAuth";

export const Router = () => {
  const { currentScreen, navigate } = useNavigation();
  const { isAuthenticated, loading } = useAuth();

  // Navegar para Home quando autenticado pela primeira vez
  useEffect(() => {
    if (isAuthenticated && !loading) {
      if (currentScreen === "Login" || currentScreen === "Register") {
        console.log('🔄 [ROUTER] Usuário autenticado, navegando para Home...', {
          currentScreen,
          isAuthenticated,
          loading
        });
        navigate("Home");
      }
    }
  }, [isAuthenticated, loading, currentScreen, navigate]);

  // Mostrar loading enquanto verifica autenticação inicial
  if (loading && !isAuthenticated) {
    console.log('⏳ [ROUTER] Aguardando verificação de autenticação...');
    return null;
  }

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
      case "EditIncome":
        return <EditIncomeScreen />;
      case "IncomeList":
        return <IncomeListScreen />;
      case "AddExpense":
        return <AddExpenseScreen />;
      case "EditExpense":
        return <EditExpenseScreen />;
      case "ExpenseList":
        return <ExpenseListScreen />;
      case "Dashboard":
        return <HomeScreen />; // Temporário até criar DashboardScreen
      case "Profile":
        return <HomeScreen />; // Temporário até criar ProfileScreen
      case "Settings":
        return <HomeScreen />; // Temporário até criar SettingsScreen
      default:
        return <HomeScreen />;
    }
  };

  return renderScreen();
};
