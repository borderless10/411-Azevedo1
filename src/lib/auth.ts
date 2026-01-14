import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User as FirebaseUser,
  UserCredential,
} from 'firebase/auth';
import { auth } from './firebase';
import { User, LoginCredentials, RegisterCredentials } from '../types/user';

/**
 * Converte usuário do Firebase para o tipo User da aplicação
 */
export const convertFirebaseUser = (firebaseUser: FirebaseUser): User => {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    createdAt: firebaseUser.metadata.creationTime 
      ? new Date(firebaseUser.metadata.creationTime)
      : undefined,
  };
};

/**
 * Realiza login do usuário
 */
export const loginUser = async (
  credentials: LoginCredentials
): Promise<User> => {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );
    
    return convertFirebaseUser(userCredential.user);
  } catch (error: any) {
    console.error('Erro ao fazer login:', error);
    throw error;
  }
};

/**
 * Registra um novo usuário
 */
export const registerUser = async (
  credentials: RegisterCredentials
): Promise<User> => {
  try {
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );
    
    // Atualizar nome do usuário se fornecido
    if (credentials.displayName) {
      await updateProfile(userCredential.user, {
        displayName: credentials.displayName,
      });
    }
    
    return convertFirebaseUser(userCredential.user);
  } catch (error: any) {
    console.error('Erro ao registrar usuário:', error);
    throw error;
  }
};

/**
 * Realiza logout do usuário
 */
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Erro ao fazer logout:', error);
    throw error;
  }
};

/**
 * Obtém o usuário atual
 */
export const getCurrentUser = (): User | null => {
  const firebaseUser = auth.currentUser;
  return firebaseUser ? convertFirebaseUser(firebaseUser) : null;
};
