# 🗂️ Estrutura Visual do Projeto

## 📁 Árvore de Arquivos Completa

```
411-Azevedo1/
│
├── 📱 App.tsx                          # Aplicação principal
├── 📦 package.json                     # Dependências
├── ⚙️ tsconfig.json                    # Config TypeScript
├── 🌍 app.json                         # Config Expo
├── 📝 index.ts                         # Entry point
│
├── 📚 Documentação/
│   ├── README.md                       # Documento principal
│   ├── README_AUTH.md                  # Docs de autenticação
│   ├── INICIO_RAPIDO.md                # Guia rápido
│   ├── INSTRUCOES.md                   # Instruções completas
│   ├── TESTE_AUTENTICACAO.md           # Guia de testes
│   ├── RESUMO_IMPLEMENTACAO.md         # Resumo técnico
│   ├── COMANDOS_UTEIS.md               # Comandos úteis
│   ├── STATUS_PROJETO.md               # Status atual
│   └── ESTRUTURA_VISUAL.md             # Este arquivo
│
├── 🔧 Configuração/
│   ├── .env.template                   # Template de variáveis
│   └── .gitignore                      # Arquivos ignorados
│
├── 🎨 assets/                          # Recursos visuais
│   ├── icon.png
│   ├── splash-icon.png
│   ├── adaptive-icon.png
│   └── favicon.png
│
└── 📂 src/                             # Código fonte
    │
    ├── 🧩 components/                  # Componentes reutilizáveis
    │   ├── ErrorBoundary.tsx
    │   ├── Header/
    │   │   ├── Header.tsx
    │   │   └── Header.css
    │   ├── Layout/
    │   │   ├── Layout.tsx
    │   │   └── Layout.css
    │   ├── Sidebar/
    │   │   ├── Sidebar.tsx
    │   │   └── Sidebar.css
    │   └── ui/
    │       ├── Button/
    │       │   ├── Button.tsx
    │       │   └── Button.css
    │       └── ErrorMessage.ts         # ✅ Novo
    │
    ├── 🎭 contexts/                    # Contextos React
    │   └── AuthContext.tsx             # ✅ Novo - Contexto de Auth
    │
    ├── 🪝 hooks/                       # Hooks customizados
    │   └── useAuth.tsx                 # ✅ Novo - Hook de Auth
    │
    ├── 🔧 lib/                         # Bibliotecas e configs
    │   ├── firebase.ts                 # ✅ Novo - Config Firebase
    │   └── auth.ts                     # ✅ Novo - Funções de Auth
    │
    ├── 🗺️ routes/                      # Rotas e navegação
    │   ├── AppRoutes.tsx               # ✅ Novo - Gerenciador
    │   ├── ProtectedRoute.tsx          # ✅ Novo - Proteção
    │   └── path.ts                     # ✅ Novo - Definições
    │
    ├── 📱 screens/                     # Telas do app
    │   └── Auth/                       # ✅ Novo - Telas de Auth
    │       ├── LoginScreen.tsx         # ✅ Novo - Login
    │       └── RegisterScreen.tsx      # ✅ Novo - Registro
    │
    ├── 🔌 services/                    # Serviços externos
    │   └── authServices.ts             # ✅ Novo - Serviço Auth
    │
    └── 📐 types/                       # Tipos TypeScript
        └── user.ts                     # ✅ Novo - Tipos de usuário
```

---

## 🎯 Organização por Funcionalidade

### 🔐 Autenticação (Módulo 1) ✅

```
Autenticação/
│
├── Tipos
│   └── src/types/user.ts
│       ├── User
│       ├── LoginCredentials
│       ├── RegisterCredentials
│       └── AuthResponse
│
├── Configuração
│   ├── src/lib/firebase.ts
│   │   ├── Firebase Config
│   │   ├── Auth Instance
│   │   └── Firestore Instance
│   │
│   └── src/lib/auth.ts
│       ├── loginUser()
│       ├── registerUser()
│       ├── logoutUser()
│       └── getCurrentUser()
│
├── Serviços
│   └── src/services/authServices.ts
│       ├── login()
│       ├── register()
│       ├── logout()
│       ├── onAuthStateChange()
│       └── isAuthenticated()
│
├── Estado Global
│   ├── src/contexts/AuthContext.tsx
│   │   ├── AuthProvider
│   │   ├── user state
│   │   ├── loading state
│   │   └── auth methods
│   │
│   └── src/hooks/useAuth.tsx
│       └── useAuth() hook
│
├── Rotas
│   ├── src/routes/path.ts
│   │   ├── PUBLIC paths
│   │   └── PRIVATE paths
│   │
│   ├── src/routes/AppRoutes.tsx
│   │   ├── Navigation Container
│   │   ├── Stack Navigator
│   │   └── Conditional Routing
│   │
│   └── src/routes/ProtectedRoute.tsx
│       └── Route Protection Logic
│
├── Interface
│   ├── src/screens/Auth/LoginScreen.tsx
│   │   ├── Login Form
│   │   ├── Validations
│   │   └── Error Handling
│   │
│   └── src/screens/Auth/RegisterScreen.tsx
│       ├── Register Form
│       ├── Validations
│       └── Password Confirmation
│
└── Utilitários
    └── src/components/ui/ErrorMessage.ts
        ├── Error Messages Map
        └── getErrorMessage()
```

---

## 🔄 Fluxo de Dados - Autenticação

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.tsx                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   AuthProvider                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │              AppRoutes                              │  │  │
│  │  │  ┌───────────────────┬───────────────────────────┐  │  │  │
│  │  │  │  Public Routes    │   Private Routes          │  │  │  │
│  │  │  │  ┌─────────────┐  │  ┌─────────────────────┐  │  │  │  │
│  │  │  │  │ LoginScreen │  │  │ HomeScreen          │  │  │  │  │
│  │  │  │  └─────────────┘  │  └─────────────────────┘  │  │  │  │
│  │  │  │  ┌─────────────┐  │  ┌─────────────────────┐  │  │  │  │
│  │  │  │  │RegisterScreen│  │  │ DashboardScreen     │  │  │  │  │
│  │  │  │  └─────────────┘  │  └─────────────────────┘  │  │  │  │
│  │  │  └───────────────────┴───────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ usa
                              ▼
                        ┌───────────┐
                        │  useAuth  │
                        └─────┬─────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
         ┌───────────┐  ┌──────────┐  ┌──────────┐
         │   user    │  │ signIn() │  │ signOut()│
         └───────────┘  └─────┬────┘  └────┬─────┘
                              │            │
                              ▼            ▼
                     ┌─────────────────────────┐
                     │    authServices.ts      │
                     └───────────┬─────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │    auth.ts      │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Firebase Auth  │
                        └─────────────────┘
```

---

## 🎨 Estrutura de Componentes

```
┌─────────────────────────────────────────────────────────┐
│                      App.tsx                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │              AuthProvider                         │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │           NavigationContainer              │  │  │
│  │  │  ┌───────────────────────────────────────┐  │  │  │
│  │  │  │        Stack.Navigator               │  │  │  │
│  │  │  │  ┌────────────────────────────────┐  │  │  │  │
│  │  │  │  │      Screen: Login             │  │  │  │  │
│  │  │  │  │  ┌──────────────────────────┐  │  │  │  │  │
│  │  │  │  │  │   LoginScreen            │  │  │  │  │  │
│  │  │  │  │  │  - Email Input           │  │  │  │  │  │
│  │  │  │  │  │  - Password Input        │  │  │  │  │  │
│  │  │  │  │  │  - Login Button          │  │  │  │  │  │
│  │  │  │  │  │  - Register Link         │  │  │  │  │  │
│  │  │  │  │  └──────────────────────────┘  │  │  │  │  │
│  │  │  │  └────────────────────────────────┘  │  │  │  │
│  │  │  │  ┌────────────────────────────────┐  │  │  │  │
│  │  │  │  │      Screen: Register         │  │  │  │  │
│  │  │  │  │  ┌──────────────────────────┐  │  │  │  │  │
│  │  │  │  │  │   RegisterScreen         │  │  │  │  │  │
│  │  │  │  │  │  - Name Input            │  │  │  │  │  │
│  │  │  │  │  │  - Email Input           │  │  │  │  │  │
│  │  │  │  │  │  - Password Input        │  │  │  │  │  │
│  │  │  │  │  │  - Confirm Password      │  │  │  │  │  │
│  │  │  │  │  │  - Register Button       │  │  │  │  │  │
│  │  │  │  │  │  - Login Link            │  │  │  │  │  │
│  │  │  │  │  └──────────────────────────┘  │  │  │  │  │
│  │  │  │  └────────────────────────────────┘  │  │  │  │
│  │  │  └───────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Mapa de Dependências

```
App.tsx
  │
  ├─→ AuthProvider (AuthContext.tsx)
  │     │
  │     ├─→ authService (authServices.ts)
  │     │     │
  │     │     ├─→ auth functions (auth.ts)
  │     │     │     │
  │     │     │     └─→ Firebase (firebase.ts)
  │     │     │
  │     │     └─→ User types (user.ts)
  │     │
  │     └─→ useState, useEffect
  │
  └─→ AppRoutes (AppRoutes.tsx)
        │
        ├─→ useAuth hook (useAuth.tsx)
        │     │
        │     └─→ AuthContext
        │
        ├─→ React Navigation
        │     │
        │     ├─→ NavigationContainer
        │     └─→ createNativeStackNavigator
        │
        └─→ Screens
              │
              ├─→ LoginScreen (LoginScreen.tsx)
              │     │
              │     ├─→ useAuth
              │     └─→ ErrorMessage (ErrorMessage.ts)
              │
              └─→ RegisterScreen (RegisterScreen.tsx)
                    │
                    ├─→ useAuth
                    └─→ ErrorMessage
```

---

## 🔑 Arquivos Chave

### 1. Entrada da Aplicação
```
index.ts
  └─→ App.tsx (root component)
```

### 2. Configuração
```
tsconfig.json      → TypeScript
app.json           → Expo
package.json       → Dependências
.env               → Variáveis (criar)
```

### 3. Autenticação (Core)
```
AuthContext.tsx    → Estado global
useAuth.tsx        → Hook de acesso
authServices.ts    → Lógica de negócio
auth.ts            → Comunicação Firebase
firebase.ts        → Configuração Firebase
```

### 4. Interface
```
LoginScreen.tsx    → Tela de login
RegisterScreen.tsx → Tela de registro
AppRoutes.tsx      → Navegação
```

---

## 📋 Checklist de Arquivos

### ✅ Criados (25 arquivos)
- [x] App.tsx
- [x] src/types/user.ts
- [x] src/lib/firebase.ts
- [x] src/lib/auth.ts
- [x] src/services/authServices.ts
- [x] src/contexts/AuthContext.tsx
- [x] src/hooks/useAuth.tsx
- [x] src/routes/path.ts
- [x] src/routes/AppRoutes.tsx
- [x] src/routes/ProtectedRoute.tsx
- [x] src/screens/Auth/LoginScreen.tsx
- [x] src/screens/Auth/RegisterScreen.tsx
- [x] src/components/ui/ErrorMessage.ts
- [x] .gitignore
- [x] .env.template
- [x] README.md
- [x] README_AUTH.md
- [x] INSTRUCOES.md
- [x] INICIO_RAPIDO.md
- [x] TESTE_AUTENTICACAO.md
- [x] RESUMO_IMPLEMENTACAO.md
- [x] COMANDOS_UTEIS.md
- [x] STATUS_PROJETO.md
- [x] ESTRUTURA_VISUAL.md

### ⏳ A Criar (quando necessário)
- [ ] .env (usuário deve criar)
- [ ] src/screens/Home/HomeScreen.tsx
- [ ] src/screens/Dashboard/DashboardScreen.tsx
- [ ] src/screens/Income/IncomeScreen.tsx
- [ ] src/screens/Expenses/ExpensesScreen.tsx

---

## 🎯 Padrões de Nomenclatura

### Arquivos
```
PascalCase:  LoginScreen.tsx, AuthContext.tsx
camelCase:   authServices.ts, firebase.ts
kebab-case:  (não usado)
UPPER_CASE:  README.md, .env
```

### Componentes
```
PascalCase:  LoginScreen, AuthProvider, ProtectedRoute
```

### Funções
```
camelCase:   signIn, loginUser, getErrorMessage
```

### Constantes
```
UPPER_CASE:  PATHS, ErrorMessages
```

### Tipos
```
PascalCase:  User, LoginCredentials, AuthResponse
```

---

## 🗂️ Convenções de Pasta

```
/screens     → Telas completas da aplicação
/components  → Componentes reutilizáveis
/contexts    → React Contexts
/hooks       → Custom Hooks
/lib         → Configurações e bibliotecas
/services    → Lógica de negócio
/routes      → Navegação
/types       → TypeScript types/interfaces
/assets      → Imagens, fontes, etc
```

---

## 📦 Tamanho dos Arquivos (Linhas de Código)

```
LoginScreen.tsx          ~160 linhas  ████████░░
RegisterScreen.tsx       ~180 linhas  █████████░
AuthContext.tsx          ~90 linhas   █████░░░░░
authServices.ts          ~60 linhas   ███░░░░░░░
auth.ts                  ~90 linhas   █████░░░░░
firebase.ts              ~40 linhas   ██░░░░░░░░
AppRoutes.tsx            ~110 linhas  ██████░░░░
useAuth.tsx              ~15 linhas   █░░░░░░░░░
ProtectedRoute.tsx       ~70 linhas   ████░░░░░░
ErrorMessage.ts          ~30 linhas   ██░░░░░░░░
```

---

## 🎨 Estilo Visual do Código

```typescript
// ✅ Padrão usado no projeto

// 1. Imports organizados
import React from 'react';
import { View, Text } from 'react-native';
import { useAuth } from '../../hooks/useAuth';

// 2. Tipos declarados
interface Props {
  title: string;
}

// 3. Componente funcional
export const Component: React.FC<Props> = ({ title }) => {
  // 4. Hooks primeiro
  const { user } = useAuth();
  
  // 5. Estado
  const [loading, setLoading] = useState(false);
  
  // 6. Funções
  const handleClick = () => {
    // lógica
  };
  
  // 7. Render
  return (
    <View>
      <Text>{title}</Text>
    </View>
  );
};

// 8. Estilos no final
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

// 9. Export default
export default Component;
```

---

## 🔍 Encontrar Rapidamente

### Por Funcionalidade
```bash
Autenticação    → src/contexts/AuthContext.tsx
Login           → src/screens/Auth/LoginScreen.tsx
Rotas           → src/routes/AppRoutes.tsx
Firebase        → src/lib/firebase.ts
Tipos           → src/types/user.ts
Erros           → src/components/ui/ErrorMessage.ts
```

### Por Tipo
```bash
Telas          → src/screens/
Componentes    → src/components/
Hooks          → src/hooks/
Contextos      → src/contexts/
Serviços       → src/services/
Rotas          → src/routes/
```

---

## 📚 Referências Rápidas

### Documentação do Projeto
```
Começar        → INICIO_RAPIDO.md
Tutorial       → INSTRUCOES.md
API Auth       → README_AUTH.md
Testar         → TESTE_AUTENTICACAO.md
Comandos       → COMANDOS_UTEIS.md
Status         → STATUS_PROJETO.md
Estrutura      → ESTRUTURA_VISUAL.md (você está aqui)
```

### Links Externos
```
Firebase       → console.firebase.google.com
Expo           → docs.expo.dev
React Nav      → reactnavigation.org
TypeScript     → typescriptlang.org
```

---

**🗂️ Estrutura organizada e pronta para crescer!**

**📍 Você está aqui:** Módulo 1 completo ✅  
**🎯 Próximo:** Módulo 3 - Cadastro de Rendas ⏳
