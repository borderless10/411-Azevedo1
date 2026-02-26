import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { authServices } from "../services/authServices";
import { userService } from "../services/userServices";
import { User, LoginCredentials, RegisterCredentials } from "../types/auth";

/**
 * Interface do contexto de autenticação
 */
interface AuthContextData {
  user: User | null;
  loading: boolean;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: RegisterCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

/**
 * Contexto de autenticação
 */
export const AuthContext = createContext<AuthContextData>(
  {} as AuthContextData,
);

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
    const unsubscribe = authServices.onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        // Buscar dados completos do Firestore
        try {
          const fullUserData = await userService.getUserById(firebaseUser.id);
          if (fullUserData) {
            // Mesclar dados do Firebase Auth com dados do Firestore
            setUser({
              ...firebaseUser,
              ...fullUserData,
            });
          } else {
            // Se não existir no Firestore, criar como usuário normal
            try {
              await userService.createUserDocument(firebaseUser.id, {
                name: firebaseUser.name || "",
                email: firebaseUser.email || "",
              });
              // Buscar novamente após criar
              const newUserData = await userService.getUserById(
                firebaseUser.id,
              );
              if (newUserData) {
                setUser({
                  ...firebaseUser,
                  ...newUserData,
                });
              } else {
                setUser(firebaseUser);
              }
            } catch (error) {
              if (__DEV__) {
                console.log("Erro ao criar documento do usuário:", error);
              }
              setUser(firebaseUser);
            }
          }
        } catch (error) {
          if (__DEV__) {
            console.log("Erro ao buscar dados do usuário:", error);
          }
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup da subscrição
    return () => unsubscribe();
  }, []);

  /**
   * Função de login
   */
  const signIn = async (credentials: LoginCredentials): Promise<void> => {
    console.log("🟢 [AUTH CONTEXT] signIn chamado");
    console.log("🟢 [AUTH CONTEXT] Credentials:", {
      email: credentials.email,
      passwordLength: credentials.password.length,
    });
    try {
      // NOTA: não definir `loading` global aqui para evitar que o `Router`
      // volte a `null` enquanto a UI local está controlando o estado de carregamento.
      console.log("🟢 [AUTH CONTEXT] Chamando authServices.login...");
      const userData = await authServices.login(credentials);
      console.log("🟢 [AUTH CONTEXT] Login bem-sucedido, user:", userData);

      // Buscar dados completos do Firestore
      try {
        const fullUserData = await userService.getUserById(userData.id);
        if (fullUserData) {
          setUser({
            ...userData,
            ...fullUserData,
          });
        } else {
          setUser(userData);
        }
      } catch (error) {
        if (__DEV__) {
          console.log("Erro ao buscar dados do usuário:", error);
        }
        setUser(userData);
      }

      console.log("🟢 [AUTH CONTEXT] Estado do usuário atualizado");
    } catch (error: any) {
      if (__DEV__) {
        console.log("❌ [AUTH CONTEXT] Erro ao fazer login:", {
          error,
          code: error?.code,
          message: error?.message,
        });
      }
      throw error;
    }
  };

  /**
   * Função de registro
   */
  const signUp = async (credentials: RegisterCredentials): Promise<void> => {
    try {
      setLoading(true);
      const userData = await authServices.register(credentials);

      // Criar documento no Firestore como usuário normal (não admin)
      try {
        await userService.createUserDocument(userData.id, {
          name: credentials.name || userData.name || "",
          email: userData.email || "",
        });
      } catch (error) {
        if (__DEV__) {
          console.log(
            "Erro ao criar documento do usuário no Firestore:",
            error,
          );
        }
        // Continuar mesmo se houver erro ao criar o documento
      }

      // Buscar dados completos do Firestore após criar o documento
      try {
        const fullUserData = await userService.getUserById(userData.id);
        if (fullUserData) {
          setUser({
            ...userData,
            ...fullUserData,
          });
        } else {
          setUser(userData);
        }
      } catch (error) {
        if (__DEV__) {
          console.log("Erro ao buscar dados do usuário após registro:", error);
        }
        setUser(userData);
      }
    } catch (error: any) {
      if (__DEV__) {
        console.log("Erro ao registrar:", error);
      }
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
      await authServices.logout();
      setUser(null);
    } catch (error: any) {
      if (__DEV__) {
        console.log("Erro ao fazer logout:", error);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Recarregar dados do usuário do Firestore
   */
  const refreshUser = async (): Promise<void> => {
    const currentUser = authServices.getCurrentUser();
    if (currentUser) {
      try {
        const fullUserData = await userService.getUserById(currentUser.id);
        if (fullUserData) {
          setUser({
            ...currentUser,
            ...fullUserData,
          });
        }
      } catch (error) {
        if (__DEV__) {
          console.log("Erro ao recarregar dados do usuário:", error);
        }
      }
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
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook para usar o contexto de autenticação
 */
export const useAuth = (): AuthContextData => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }

  return context;
};

export default AuthContext;
