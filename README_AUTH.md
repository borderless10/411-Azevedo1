# 🔐 Sistema de Autenticação - Controle Financeiro

## 📋 Visão Geral

Sistema completo de autenticação implementado com Firebase Authentication, incluindo:

- ✅ Login com email e senha
- ✅ Registro de novos usuários
- ✅ Logout
- ✅ Rotas protegidas
- ✅ Gerenciamento de sessão
- ✅ Tratamento de erros personalizado

## 📁 Estrutura de Arquivos

```
src/
├── contexts/
│   └── AuthContext.tsx          # Contexto de autenticação
├── hooks/
│   └── useAuth.tsx              # Hook customizado para autenticação
├── lib/
│   ├── firebase.ts              # Configuração do Firebase
│   └── auth.ts                  # Funções de autenticação
├── routes/
│   ├── AppRoutes.tsx            # Rotas da aplicação
│   ├── ProtectedRoute.tsx       # Componente de rota protegida
│   └── path.ts                  # Caminhos de rotas
├── services/
│   └── authServices.ts          # Serviço de autenticação
├── types/
│   └── user.ts                  # Tipos TypeScript de usuário
└── components/
    └── ui/
        └── ErrorMessage.ts      # Mensagens de erro
```

## 🚀 Configuração do Firebase

### 1. Criar projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Siga as instruções para criar seu projeto

### 2. Habilitar Authentication

1. No menu lateral, clique em "Authentication"
2. Clique em "Começar"
3. Na aba "Sign-in method", habilite "E-mail/senha"

### 3. Obter credenciais

1. Vá em "Configurações do projeto" (ícone de engrenagem)
2. Na seção "Seus aplicativos", clique no ícone da web (</>)
3. Registre seu app e copie as configurações

### 4. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=sua_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=seu_app_id
```

## 📖 Como Usar

### Hook useAuth

```tsx
import { useAuth } from './src/hooks/useAuth';

function MeuComponente() {
  const { user, signIn, signOut, isAuthenticated, loading } = useAuth();

  const handleLogin = async () => {
    try {
      await signIn({ 
        email: 'usuario@email.com', 
        password: 'senha123' 
      });
    } catch (error) {
      console.error('Erro ao fazer login:', error);
    }
  };

  return (
    // Seu componente aqui
  );
}
```

### Rota Protegida

```tsx
import ProtectedRoute from './src/routes/ProtectedRoute';

function MinhaTelaProtegida() {
  return (
    <ProtectedRoute>
      <View>
        <Text>Conteúdo protegido!</Text>
      </View>
    </ProtectedRoute>
  );
}
```

## 🔑 Funcionalidades Implementadas

### 1. Login (signIn)
```tsx
const { signIn } = useAuth();

await signIn({
  email: 'usuario@email.com',
  password: 'senha123'
});
```

### 2. Registro (signUp)
```tsx
const { signUp } = useAuth();

await signUp({
  email: 'novo@email.com',
  password: 'senha123',
  displayName: 'Novo Usuário'
});
```

### 3. Logout (signOut)
```tsx
const { signOut } = useAuth();

await signOut();
```

### 4. Verificar autenticação
```tsx
const { isAuthenticated, user } = useAuth();

if (isAuthenticated) {
  console.log('Usuário logado:', user?.email);
}
```

## 🛡️ Tratamento de Erros

O sistema inclui mensagens de erro personalizadas em português:

- `auth/invalid-email` → "Email inválido"
- `auth/user-not-found` → "Usuário não encontrado"
- `auth/wrong-password` → "Senha incorreta"
- `auth/email-already-in-use` → "Email já está em uso"
- E mais...

Uso:
```tsx
import { getErrorMessage } from './src/components/ui/ErrorMessage';

try {
  await signIn(credentials);
} catch (error: any) {
  const message = getErrorMessage(error.code);
  alert(message);
}
```

## 🗺️ Rotas

Rotas definidas em `src/routes/path.ts`:

### Rotas Públicas
- `/login` - Tela de login
- `/register` - Tela de registro

### Rotas Privadas (Requerem autenticação)
- `/home` - Página inicial
- `/dashboard` - Dashboard financeiro
- `/income` - Gerenciar rendas
- `/expenses` - Gerenciar gastos
- `/profile` - Perfil do usuário
- `/settings` - Configurações

## 📦 Dependências Instaladas

```json
{
  "firebase": "^10.x.x",
  "@react-navigation/native": "^6.x.x",
  "@react-navigation/native-stack": "^6.x.x",
  "react-native-screens": "^3.x.x",
  "react-native-safe-area-context": "^4.x.x"
}
```

## 🔄 Fluxo de Autenticação

1. **Usuário não autenticado**
   - Visualiza telas de Login e Registro
   - Pode criar conta ou fazer login

2. **Login bem-sucedido**
   - Firebase retorna credenciais
   - Estado do usuário é atualizado
   - Redirecionamento automático para rotas protegidas

3. **Usuário autenticado**
   - Acesso às rotas privadas
   - Dados do usuário disponíveis via useAuth
   - Sessão mantida automaticamente

4. **Logout**
   - Limpa estado do usuário
   - Redireciona para tela de login

## 🧪 Próximos Passos

Para continuar o desenvolvimento:

1. **Criar telas de autenticação:**
   - `src/screens/Auth/LoginScreen.tsx`
   - `src/screens/Auth/RegisterScreen.tsx`

2. **Criar telas protegidas:**
   - `src/screens/Home/HomeScreen.tsx`
   - `src/screens/Dashboard/DashboardScreen.tsx`
   - `src/screens/Income/IncomeScreen.tsx`
   - `src/screens/Expenses/ExpensesScreen.tsx`

3. **Implementar funcionalidades:**
   - Módulo de Rendas Diárias (Módulo 3 e 4)
   - Módulo de Gastos (Módulo 6 e 7)
   - Dashboard (Módulo 9 e 10)

## 📝 Notas Importantes

- ⚠️ **Nunca commite o arquivo `.env` com credenciais reais**
- 🔒 Use o `.env.example` como template
- 🔐 Configure regras de segurança no Firebase Console
- 📱 Teste em dispositivo real para melhor experiência

## 🆘 Problemas Comuns

### Firebase não inicializa
- Verifique se as variáveis de ambiente estão corretas
- Certifique-se de que o Firebase está configurado no console

### Erro de autenticação
- Verifique se o método de autenticação está habilitado
- Confirme que o email/senha estão corretos

### Navegação não funciona
- Reinicie o servidor Expo
- Limpe o cache: `npx expo start -c`

## 📞 Suporte

Para dúvidas ou problemas, consulte:
- [Documentação Firebase](https://firebase.google.com/docs)
- [Documentação React Navigation](https://reactnavigation.org/)
- [Documentação Expo](https://docs.expo.dev/)

---

**Desenvolvido com ❤️ para o MVP de Controle Financeiro Pessoal**
