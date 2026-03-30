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
import { ProfileScreen } from "../screens/Profile/ProfileScreen";
import { SettingsScreen } from "../screens/Settings/SettingsScreen";
import { ConsumoModeradoScreen } from "../screens/ConsumoModerado/ConsumoModeradoScreen";
import { FeedScreen } from "../screens/Feed/FeedScreen";
import { ChatScreen } from "../screens/Chat/ChatScreen";
import { MetasScreen } from "../screens/Metas/MetasScreen";
import { WishlistScreen } from "../screens/Wishlist/WishlistScreen";
import { InvestmentsScreen } from "../screens/Investments/InvestmentsScreen";
import { RecomendacaoScreen } from "../screens/Recomendacao/RecomendacaoScreen";
import { BudgetScreen } from "../screens/Budget/BudgetScreen";
import { RankingScreen } from "../screens/Ranking/RankingScreen";
import { BillsScreen } from "../screens/Bills/BillsScreen";
import { CadastrarClienteScreen } from "../screens/Admin/CadastrarClienteScreen";
import { AdminUsersScreen } from "../screens/Admin/AdminUsersScreen";
import { ClientPlanningScreen } from "../screens/Consultor/ClientPlanningScreen";
import { ClientDetail } from "../screens/Consultor/ClientDetail";
import { ClientInvestments } from "../screens/Consultor/ClientInvestments";
import { ClientInvestmentsView } from "../screens/Consultor/ClientInvestmentsView";
import { ClientList } from "../screens/Consultor/ClientList";
import { PlanningViewScreen } from "../screens/Client/PlanningViewScreen";
import { useNavigation } from "./NavigationContext";
import { useAuth } from "../hooks/useAuth";
import { ConsultorHome } from "../screens/Consultor/ConsultorHome";
import { EditUserScreen } from "../screens/Admin/EditUserScreen";
import { CardsScreen } from "../screens/Cards";

export const Router = () => {
  const { currentScreen, navigate } = useNavigation();
  const { isAuthenticated, loading, user } = useAuth();

  // Navegar para Home quando autenticado pela primeira vez
  useEffect(() => {
    if (isAuthenticated && !loading) {
      if (currentScreen === "Login" || currentScreen === "Register") {
        console.log("🔄 [ROUTER] Usuário autenticado, navegando para Home...", {
          currentScreen,
          isAuthenticated,
          loading,
        });
        // Redirect based on role: consultor -> ConsultorHome, admin -> AdminUsers, others -> Home
        if (user && user.role === "consultor") {
          navigate("ConsultorHome");
        } else if (user && (user.isAdmin === true || user.role === "admin")) {
          navigate("AdminUsers");
        } else {
          navigate("Home");
        }
      }
    }
  }, [isAuthenticated, loading, currentScreen, navigate]);

  // Mostrar loading enquanto verifica autenticação inicial
  if (loading && !isAuthenticated) {
    console.log("⏳ [ROUTER] Aguardando verificação de autenticação...");
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
        // If current user is a consultor or admin, show their dedicated home
        if (user && user.role === "consultor") {
          return <ConsultorHome />;
        }
        if (user && (user.isAdmin === true || user.role === "admin")) {
          return <AdminUsersScreen />;
        }
        return <HomeScreen />;
      case "ConsultorHome":
        return <ConsultorHome />;
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
      case "ConsumoModerado":
        return <ConsumoModeradoScreen />;
      case "Feed":
        return <FeedScreen />;
      case "Chat":
        return <ChatScreen />;
      case "Metas":
        return <MetasScreen />;
      case "Wishlist":
        return <WishlistScreen />;
      case "Investments":
        return <InvestmentsScreen />;
      case "Recomendacao":
        return <RecomendacaoScreen />;
      case "Budget":
        return <BudgetScreen />;
      case "ClientPlanning":
        return <ClientPlanningScreen />;
      case "ClientInvestments":
        return <ClientInvestments />;
      case "ClientInvestmentsView":
        return <ClientInvestmentsView />;
      case "ClientList":
        return <ClientList />;
      case "ClientDetail":
        return <ClientDetail />;
      case "PlanningView":
        return <PlanningViewScreen />;
      case "Bills":
        return <BillsScreen />;
      case "Ranking":
        return <RankingScreen />;
      case "Profile":
        return <ProfileScreen />;
      case "Settings":
        return <SettingsScreen />;
      case "Cartoes":
        return <CardsScreen />;
      case "CadastrarCliente":
        return <CadastrarClienteScreen />;
      case "AdminUsers":
        return <AdminUsersScreen />;
      case "EditUser":
        return <EditUserScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return renderScreen();
};
