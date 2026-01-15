import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authServices';
import { User, LoginCredentials, RegisterCredentials } from '../types/user';

/**
 * Interface do contexto de autenticação
 */
interface AuthContextData {
  user: User | null;
  loading: boolean;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: RegisterCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

/**
 * Contexto de autenticação
 */
export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

/**
 * Props do Provider de autenticação
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provider de autenticação
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Observar mudanças no estado de autenticação
    const unsubscribe = authService.onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    // Cleanup da subscrição
    return () => unsubscribe();
  }, []);

  /**
   * Função de login
   */
  const signIn = async (credentials: LoginCredentials): Promise<void> => {
    console.log('🟢 [AUTH CONTEXT] signIn chamado');
    console.log('🟢 [AUTH CONTEXT] Credentials:', { email: credentials.email, passwordLength: credentials.password.length });
    try {
      setLoading(true);
      console.log('🟢 [AUTH CONTEXT] Chamando authService.login...');
      const userData = await authService.login(credentials);
      console.log('🟢 [AUTH CONTEXT] Login bem-sucedido, user:', userData);
      setUser(userData);
      console.log('🟢 [AUTH CONTEXT] Estado do usuário atualizado');
    } catch (error: any) {
      console.error('❌ [AUTH CONTEXT] Erro ao fazer login:', error);
      console.error('❌ [AUTH CONTEXT] Error code:', error.code);
      console.error('❌ [AUTH CONTEXT] Error message:', error.message);
      throw error;
    } finally {
      setLoading(false);
      console.log('🟢 [AUTH CONTEXT] Loading finalizado');
    }
  };

  /**
   * Função de registro
   */
  const signUp = async (credentials: RegisterCredentials): Promise<void> => {
    try {
      setLoading(true);
      const userData = await authService.register(credentials);
      setUser(userData);
    } catch (error: any) {
      console.error('Erro ao registrar:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Função de logout
   */
  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      await authService.logout();
      setUser(null);
    } catch (error: any) {
      console.error('Erro ao fazer logout:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
