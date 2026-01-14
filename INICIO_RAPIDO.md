# 🚀 Início Rápido - Controle Financeiro

## ⚡ 3 Passos para Começar

### 1️⃣ Configure o Firebase (5 minutos)

1. Acesse [console.firebase.google.com](https://console.firebase.google.com/)
2. Crie um projeto novo
3. Vá em **Authentication** → Clique em "Começar"
4. Habilite **E-mail/senha** na aba "Sign-in method"
5. Vá em **⚙️ Configurações do projeto**
6. Role até "Seus aplicativos" → Clique em **</>** (Web)
7. Copie as credenciais

### 2️⃣ Crie o arquivo .env

Na **raiz do projeto**, crie um arquivo chamado `.env`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=sua_api_key_aqui
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

**⚠️ Cole suas credenciais reais aqui!**

### 3️⃣ Execute o projeto

```bash
npm start
```

Escolha a plataforma:
- Pressione **`w`** para Web
- Pressione **`a`** para Android (emulador)
- Pressione **`i`** para iOS (emulador)
- Escaneie o QR Code com Expo Go

---

## 🧪 Teste Rápido

### Criar conta:
1. Abra o app
2. Clique em "Cadastre-se"
3. Preencha:
   - Nome: Seu Nome
   - Email: teste@email.com
   - Senha: teste123
   - Confirme a senha
4. Clique em "Criar Conta"
5. ✅ Você será redirecionado para Home

### Fazer login:
1. Clique em "Sair"
2. Digite email e senha
3. Clique em "Entrar"
4. ✅ Você está logado!

---

## 📂 Estrutura do Projeto

```
src/
├── contexts/AuthContext.tsx      # Gerencia autenticação
├── hooks/useAuth.tsx             # Hook para usar auth
├── screens/Auth/
│   ├── LoginScreen.tsx           # Tela de login
│   └── RegisterScreen.tsx        # Tela de registro
├── routes/
│   ├── AppRoutes.tsx             # Rotas do app
│   └── path.ts                   # Caminhos
└── lib/
    └── firebase.ts               # Config Firebase
```

---

## 💡 Como Usar no Código

```tsx
import { useAuth } from './src/hooks/useAuth';

function MeuComponente() {
  const { user, signIn, signOut, isAuthenticated } = useAuth();

  return (
    <View>
      {isAuthenticated ? (
        <Text>Olá, {user?.displayName}!</Text>
      ) : (
        <Text>Faça login</Text>
      )}
    </View>
  );
}
```

---

## ❌ Problemas Comuns

### "Firebase não inicializado"
➡️ **Solução:** Verifique se o `.env` está correto e reinicie o servidor

### "Email já está em uso"
➡️ **Solução:** Use outro email ou exclua o usuário no Firebase Console

### Tela branca
➡️ **Solução:** Limpe o cache: `npx expo start -c`

---

## 📚 Mais Informações

- 📖 **README_AUTH.md** - Documentação completa
- 📋 **INSTRUCOES.md** - Guia detalhado
- 🧪 **TESTE_AUTENTICACAO.md** - Guia de testes
- 📊 **RESUMO_IMPLEMENTACAO.md** - O que foi feito

---

## ✅ Checklist

- [ ] Firebase configurado
- [ ] Arquivo `.env` criado com credenciais
- [ ] Servidor rodando (`npm start`)
- [ ] Consegui criar uma conta
- [ ] Consegui fazer login
- [ ] Consegui fazer logout

---

## 🎉 Pronto!

Seu sistema de autenticação está funcionando!

**Próximos passos:**
- Implemente o módulo de Rendas
- Adicione o módulo de Gastos
- Crie o Dashboard

**Dúvidas?** Consulte a documentação completa! 📚

---

**Bom desenvolvimento! 💻🚀**
