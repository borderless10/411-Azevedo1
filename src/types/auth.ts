export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  bio?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface authState {
    user: User | null;
    isLoading: boolean;
    error: string | null;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterCredentials extends LoginCredentials {
    name: string;
    displayName?: string;
    password: string;
    confirmPassword: string;
}