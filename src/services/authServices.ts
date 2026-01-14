import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { loginUser, registerUser, logoutUser, convertFirebaseUser } from '../lib/auth';
import { User, LoginCredentials, RegisterCredentials } from '../types/user';

/**
 * Serviço de autenticação centralizado
 */
class AuthService {
  /**
   * Faz login do usuário
   */
  async login(credentials: LoginCredentials): Promise<User> {
    return await loginUser(credentials);
  }

  /**
   * Registra um novo usuário
   */
  async register(credentials: RegisterCredentials): Promise<User> {
    return await registerUser(credentials);
  }

  /**
   * Faz logout do usuário
   */
  async logout(): Promise<void> {
    return await logoutUser();
  }

  /**
   * Observa mudanças no estado de autenticação
   */
  onAuthStateChange(
    callback: (user: User | null) => void
  ): () => void {
    return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      const user = firebaseUser ? convertFirebaseUser(firebaseUser) : null;
      callback(user);
    });
  }

  /**
   * Verifica se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    return auth.currentUser !== null;
  }

  /**
   * Obtém o usuário atual
   */
  getCurrentUser(): User | null {
    const firebaseUser = auth.currentUser;
    return firebaseUser ? convertFirebaseUser(firebaseUser) : null;
  }
}

// Exportar instância única do serviço (Singleton)
export const authService = new AuthService();
export default authService;
