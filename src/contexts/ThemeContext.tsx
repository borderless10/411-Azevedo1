/**
 * Context para gerenciar o tema (claro/escuro) da aplicação
 */

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark';

interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
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
  background: '#F5F5F5',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  border: '#E0E0E0',
  primary: '#007AFF',
  success: '#4CAF50',
  danger: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  inputBackground: '#F9F9F9',
  placeholder: '#999999',
};

const darkColors: ThemeColors = {
  background: '#000000',
  card: '#1a1a1a',
  text: '#FFFFFF',
  textSecondary: '#999999',
  border: '#333333',
  primary: '#007AFF',
  success: '#4CAF50',
  danger: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  inputBackground: '#2a2a2a',
  placeholder: '#666666',
};

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

const THEME_STORAGE_KEY = '@App:theme';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.log('Erro ao carregar tema:', error);
    }
  };

  const saveTheme = async (newTheme: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.log('Erro ao salvar tema:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    saveTheme(newTheme);
  };

  const setThemeMode = (mode: ThemeMode) => {
    setTheme(mode);
    saveTheme(mode);
  };

  const colors = theme === 'dark' ? darkColors : lightColors;
  const isDark = theme === 'dark';

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
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
};
