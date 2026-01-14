/**
 * Tipo do usuário da aplicação
 */
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt?: Date;
}

/**
 * Tipo para dados de login
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Tipo para dados de registro
 */
export interface RegisterCredentials {
  email: string;
  password: string;
  displayName?: string;
}

/**
 * Tipo para resposta de autenticação
 */
export interface AuthResponse {
  user: User;
  token?: string;
}
