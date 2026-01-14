/**
 * Caminhos de rotas da aplicação
 */

export const PATHS = {
  // Rotas públicas
  LOGIN: '/login',
  REGISTER: '/register',
  
  // Rotas privadas
  HOME: '/home',
  DASHBOARD: '/dashboard',
  INCOME: '/income',
  EXPENSES: '/expenses',
  PROFILE: '/profile',
  SETTINGS: '/settings',
} as const;

// Tipo derivado dos paths
export type PathType = typeof PATHS[keyof typeof PATHS];

/**
 * Verifica se uma rota é pública
 */
export const isPublicRoute = (path: string): boolean => {
  return path === PATHS.LOGIN || path === PATHS.REGISTER;
};

/**
 * Verifica se uma rota é privada
 */
export const isPrivateRoute = (path: string): boolean => {
  return !isPublicRoute(path);
};

export default PATHS;
