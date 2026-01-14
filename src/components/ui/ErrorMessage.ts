/**
 * Mensagens de erro personalizadas para a aplicação
 */

export const ErrorMessages = {
  // Erros de autenticação
  'auth/invalid-email': 'Email inválido',
  'auth/user-disabled': 'Usuário desabilitado',
  'auth/user-not-found': 'Usuário não encontrado',
  'auth/wrong-password': 'Senha incorreta',
  'auth/email-already-in-use': 'Email já está em uso',
  'auth/weak-password': 'Senha muito fraca. Use pelo menos 6 caracteres',
  'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
  'auth/network-request-failed': 'Erro de conexão. Verifique sua internet',
  
  // Erros gerais
  'default': 'Ocorreu um erro inesperado',
  'required-field': 'Este campo é obrigatório',
  'invalid-credentials': 'Email ou senha incorretos',
};

/**
 * Função para obter mensagem de erro amigável
 */
export const getErrorMessage = (errorCode: string): string => {
  return ErrorMessages[errorCode as keyof typeof ErrorMessages] || ErrorMessages.default;
};

export default ErrorMessages;
