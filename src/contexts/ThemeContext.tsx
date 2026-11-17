/**
 * Context para gerenciar o tema (claro/escuro) da aplicação.
 * Dark mode = identidade premium da Home (visaoPremium).
 */

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { premium } from "../theme/visaoPremium";

type ThemeMode = "light" | "dark";

interface ThemeColors {
  background: string;
  card: string;
  cardElevated: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  primarySoft: string;
  magenta: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
  inputBackground: string;
  placeholder: string;
}

interface ThemeContextData {
  theme: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const lightColors: ThemeColors = {
  background: "#f4f2fa",
  card: "#ede9f9",
  cardElevated: "#e4dff5",
  text: "#010100",
  textSecondary: "#4a4060",
  border: "#d4cbea",
  primary: premium.purpleSoft,
  primarySoft: premium.purpleSoft,
  magenta: premium.magenta,
  success: premium.purpleSoft,
  danger: premium.magentaSoft,
  warning: "#c084fc",
  info: premium.purpleSoft,
  inputBackground: "#e4dff5",
  placeholder: "#6b6480",
};

const darkColors: ThemeColors = {
  background: premium.bg,
  card: premium.surface,
  cardElevated: premium.surfaceElevated,
  text: premium.text,
  textSecondary: premium.textSecondary,
  border: premium.border,
  primary: premium.purple,
  primarySoft: premium.purpleSoft,
  magenta: premium.magenta,
  success: premium.purpleBright,
  danger: premium.magenta,
  warning: "#c084fc",
  info: premium.purpleSoft,
  inputBackground: premium.surfaceElevated,
  placeholder: "#6b6480",
};

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

const THEME_STORAGE_KEY = "@App:theme";

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.log("Erro ao carregar tema:", error);
    }
  };

  const saveTheme = async (newTheme: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.log("Erro ao salvar tema:", error);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    saveTheme(newTheme);
  };

  const setThemeMode = (mode: ThemeMode) => {
    setTheme(mode);
    saveTheme(mode);
  };

  const colors = theme === "dark" ? darkColors : lightColors;
  const isDark = theme === "dark";

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors,
        toggleTheme,
        setThemeMode,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme deve ser usado dentro de um ThemeProvider");
  }
  return context;
};
