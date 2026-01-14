# 💰 Controle Financeiro Pessoal - MVP

> Aplicativo completo de controle financeiro com autenticação, gestão de rendas e gastos, dashboard e muito mais.

## 🎯 Sobre o Projeto

Sistema de controle financeiro pessoal desenvolvido para ajudar usuários e pequenos empreendedores a organizarem suas finanças de forma prática e visual.

### ✨ Funcionalidades

- ✅ **Autenticação completa** (Login, Registro, Logout)
- 🔐 **Rotas protegidas** com Firebase Authentication
- 📊 **Dashboard** com indicadores financeiros (em breve)
- 💵 **Gestão de rendas** diárias (em breve)
- 💸 **Controle de gastos** por categoria (em breve)
- 📈 **Gráficos** e visualizações (em breve)
- 🌙 **Dark mode** (em breve)
- 📤 **Exportação** de dados (em breve)

## 🚀 Início Rápido

### 1. Configure o Firebase

```bash
# 1. Acesse console.firebase.google.com
# 2. Crie um projeto
# 3. Habilite Authentication > Email/Password
# 4. Copie as credenciais
```

### 2. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=sua_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 3. Execute o projeto

```bash
npm install  # Se necessário
npm start
```

Pressione:
- **`w`** para abrir no navegador
- **`a`** para Android
- **`i`** para iOS

## 📚 Documentação Completa

### 🚀 Começar
- 📖 [**INICIO_RAPIDO.md**](INICIO_RAPIDO.md) - Comece aqui! (5 min)
- 📋 [**INSTRUCOES.md**](INSTRUCOES.md) - Instruções completas

### 🔐 Autenticação
- 🔐 [**README_AUTH.md**](README_AUTH.md) - Documentação técnica completa
- 🧪 [**TESTE_AUTENTICACAO.md**](TESTE_AUTENTICACAO.md) - Guia de testes

### 📊 Status e Progresso
- 📊 [**STATUS_PROJETO.md**](STATUS_PROJETO.md) - Status atual do projeto
- 📋 [**RESUMO_IMPLEMENTACAO.md**](RESUMO_IMPLEMENTACAO.md) - O que foi feito
- 📈 [**SUMARIO_EXECUTIVO.md**](SUMARIO_EXECUTIVO.md) - Sumário executivo

### 🛠️ Referências
- 🗂️ [**ESTRUTURA_VISUAL.md**](ESTRUTURA_VISUAL.md) - Estrutura do projeto
- 🔧 [**COMANDOS_UTEIS.md**](COMANDOS_UTEIS.md) - Comandos úteis

**Total: 10 documentos | ~25 páginas de documentação**

## 🛠️ Tecnologias

- **React Native** - Framework mobile
- **Expo** - Desenvolvimento e build
- **TypeScript** - Tipagem estática
- **Firebase** - Backend e autenticação
- **React Navigation** - Navegação entre telas

## 📦 Estrutura do Projeto

```
src/
├── components/        # Componentes reutilizáveis
│   └── ui/           # Componentes de UI
├── contexts/         # Contexts React
│   └── AuthContext.tsx
├── hooks/            # Hooks customizados
│   └── useAuth.tsx
├── lib/              # Configurações
│   ├── firebase.ts
│   └── auth.ts
├── routes/           # Navegação
│   ├── AppRoutes.tsx
│   ├── ProtectedRoute.tsx
│   └── path.ts
├── screens/          # Telas
│   └── Auth/
│       ├── LoginScreen.tsx
│       └── RegisterScreen.tsx
├── services/         # Serviços
│   └── authServices.ts
└── types/            # Tipos TypeScript
    └── user.ts
```

## ✅ Status de Implementação

### Módulo 1 - Autenticação ✅ COMPLETO
- [x] Login com email/senha
- [x] Registro de usuários
- [x] Logout
- [x] Proteção de rotas
- [x] Persistência de sessão

### Próximos Módulos
- [ ] Módulo 3: Cadastro de Rendas Diárias (7h)
- [ ] Módulo 4: Listagem de Rendas (6h)
- [ ] Módulo 6: CRUD de Gastos (7h)
- [ ] Módulo 7: Filtros de Gastos (6h)
- [ ] Módulo 9: Dashboard (7h)
- [ ] Módulo 10: Gráficos (6h)

## 💻 Exemplo de Uso

```tsx
import { useAuth } from './src/hooks/useAuth';

function MeuComponente() {
  const { user, signIn, signOut, isAuthenticated } = useAuth();

  const handleLogin = async () => {
    await signIn({ 
      email: 'usuario@email.com', 
      password: 'senha123' 
    });
  };

  return (
    <View>
      {isAuthenticated ? (
        <>
          <Text>Olá, {user?.displayName}!</Text>
          <Button onPress={signOut}>Sair</Button>
        </>
      ) : (
        <Button onPress={handleLogin}>Entrar</Button>
      )}
    </View>
  );
}
```

## 🧪 Testes

Execute os testes manuais seguindo o guia:

```bash
# Ver TESTE_AUTENTICACAO.md para checklist completo
```

## 📱 Plataformas Suportadas

- ✅ Web
- ✅ Android
- ✅ iOS

## 📄 Licença

Este projeto é parte de um MVP privado.

## 👨‍💻 Desenvolvimento

**Estimativa Total:** 110 horas (versão robusta)  
**Tempo MVP:** 60 horas

**Módulo 1 (Autenticação):**
- Estimado: 8 horas
- Real: ~7 horas
- Status: ✅ Completo

## 🤝 Contribuindo

Este é um projeto privado. Para sugestões ou problemas, entre em contato com o time de desenvolvimento.

## 📞 Suporte

Para dúvidas:
1. Consulte a [documentação](README_AUTH.md)
2. Veja os [testes](TESTE_AUTENTICACAO.md)
3. Leia as [instruções](INSTRUCOES.md)

## 🎉 Começar Agora

1. **Configure o Firebase** (5 min)
2. **Crie o arquivo .env** (2 min)
3. **Execute `npm start`** (1 min)
4. **Crie sua primeira conta!**

➡️ **[Ver guia de início rápido](INICIO_RAPIDO.md)**

---

**Desenvolvido com ❤️ por Fernando Azevedo**  
**Data:** Janeiro 2026  
**Status:** 🚀 Em desenvolvimento ativo