import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { User, LoginCredentials, RegisterCredentials } from '../types/auth';

/**
 * Converter usuário do Firebase para o tipo da aplicação
 */
const convertFirebaseUser = (firebaseUser: FirebaseUser): User => {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || '',
    email: firebaseUser.email || '',
    username: firebaseUser.email?.split('@')[0] || '',
    createdAt: firebaseUser.metadata.creationTime 
      ? new Date(firebaseUser.metadata.creationTime)
      : new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Serviço de autenticação
 */
export const authServices = {
  /**
   * Fazer login
   */
  async login(credentials: LoginCredentials): Promise<User> {
    console.log('🟡 [AUTH SERVICE] login chamado');
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );
      console.log('🟡 [AUTH SERVICE] Login bem-sucedido');
      return convertFirebaseUser(userCredential.user);
    } catch (error) {
      if (__DEV__) {
        console.log('❌ [AUTH SERVICE] Erro no login:', error);
      }
      throw error;
    }
  },

  /**
   * Registrar novo usuário
   */
  async register(credentials: RegisterCredentials): Promise<User> {
    console.log('🟡 [AUTH SERVICE] register chamado');
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      // Atualizar nome do usuário
      if (credentials.name) {
        await updateProfile(userCredential.user, {
          displayName: credentials.name,
        });
      }

      console.log('🟡 [AUTH SERVICE] Registro bem-sucedido');
      return convertFirebaseUser(userCredential.user);
    } catch (error) {
      if (__DEV__) {
        console.log('❌ [AUTH SERVICE] Erro no registro:', error);
      }
      throw error;
    }
  },

  /**
   * Fazer logout
   */
  async logout(): Promise<void> {
    console.log('🟡 [AUTH SERVICE] logout chamado');
    try {
      await signOut(auth);
      console.log('🟡 [AUTH SERVICE] Logout bem-sucedido');
    } catch (error) {
      if (__DEV__) {
        console.log('❌ [AUTH SERVICE] Erro no logout:', error);
      }
      throw error;
    }
  },

  /**
   * Observar mudanças no estado de autenticação
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    console.log('🟡 [AUTH SERVICE] onAuthStateChange registrado');
    return onAuthStateChanged(auth, (firebaseUser) => {
      const user = firebaseUser ? convertFirebaseUser(firebaseUser) : null;
      console.log('🟡 [AUTH SERVICE] Estado de auth mudou:', user ? 'logado' : 'deslogado');
      callback(user);
    });
  },

  /**
   * Verificar se está autenticado
   */
  isAuthenticated(): boolean {
    return auth.currentUser !== null;
  },

  /**
   * Obter usuário atual
   */
  getCurrentUser(): User | null {
    const firebaseUser = auth.currentUser;
    return firebaseUser ? convertFirebaseUser(firebaseUser) : null;
  },
};

export default authServices;
