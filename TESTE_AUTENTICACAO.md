# 🧪 Guia de Testes - Sistema de Autenticação

## 📋 Checklist de Testes

### ✅ Pré-requisitos
- [ ] Firebase configurado no console
- [ ] Email/Password habilitado no Authentication
- [ ] Arquivo `.env` criado com credenciais corretas
- [ ] Dependências instaladas (`npm install`)
- [ ] App iniciado (`npm start`)

---

## 🔍 Testes Funcionais

### 1. Teste de Registro de Usuário

#### Cenário 1.1: Registro bem-sucedido
**Passos:**
1. Abra o aplicativo
2. Clique em "Não tem uma conta? Cadastre-se"
3. Preencha os campos:
   - Nome: João Silva
   - Email: joao@teste.com
   - Senha: teste123
   - Confirmar senha: teste123
4. Clique em "Criar Conta"

**Resultado esperado:**
- ✅ Loading aparece
- ✅ Usuário é criado no Firebase
- ✅ Redirecionamento automático para Home
- ✅ Mensagem de boas-vindas com o nome

#### Cenário 1.2: Validação de campos vazios
**Passos:**
1. Vá para tela de registro
2. Deixe campos vazios
3. Clique em "Criar Conta"

**Resultado esperado:**
- ✅ Alerta: "Por favor, informe seu nome"
- ✅ Não envia requisição

#### Cenário 1.3: Validação de senha fraca
**Passos:**
1. Vá para tela de registro
2. Preencha com senha de 5 caracteres
3. Clique em "Criar Conta"

**Resultado esperado:**
- ✅ Alerta: "A senha deve ter pelo menos 6 caracteres"

#### Cenário 1.4: Senhas não coincidem
**Passos:**
1. Vá para tela de registro
2. Digite senhas diferentes
3. Clique em "Criar Conta"

**Resultado esperado:**
- ✅ Alerta: "As senhas não coincidem"

#### Cenário 1.5: Email já cadastrado
**Passos:**
1. Tente registrar com email já usado
2. Clique em "Criar Conta"

**Resultado esperado:**
- ✅ Alerta: "Email já está em uso"

---

### 2. Teste de Login

#### Cenário 2.1: Login bem-sucedido
**Passos:**
1. Abra o aplicativo (ou faça logout)
2. Preencha:
   - Email: joao@teste.com
   - Senha: teste123
3. Clique em "Entrar"

**Resultado esperado:**
- ✅ Loading aparece
- ✅ Redirecionamento para Home
- ✅ Dados do usuário carregados

#### Cenário 2.2: Email não cadastrado
**Passos:**
1. Tente login com email inexistente
2. Clique em "Entrar"

**Resultado esperado:**
- ✅ Alerta: "Usuário não encontrado"

#### Cenário 2.3: Senha incorreta
**Passos:**
1. Digite email válido
2. Digite senha errada
3. Clique em "Entrar"

**Resultado esperado:**
- ✅ Alerta: "Senha incorreta"

#### Cenário 2.4: Campos vazios
**Passos:**
1. Deixe campos vazios
2. Clique em "Entrar"

**Resultado esperado:**
- ✅ Alerta: "Por favor, informe seu email"

---

### 3. Teste de Logout

#### Cenário 3.1: Logout bem-sucedido
**Passos:**
1. Faça login
2. Na Home, clique em "Sair"

**Resultado esperado:**
- ✅ Usuário deslogado
- ✅ Redirecionamento para Login
- ✅ Não é possível voltar sem fazer login novamente

---

### 4. Teste de Proteção de Rotas

#### Cenário 4.1: Acesso sem autenticação
**Passos:**
1. Garanta que está deslogado
2. Tente acessar uma rota protegida

**Resultado esperado:**
- ✅ Redirecionamento automático para Login
- ✅ Não consegue acessar conteúdo protegido

#### Cenário 4.2: Acesso com autenticação
**Passos:**
1. Faça login
2. Navegue entre telas protegidas

**Resultado esperado:**
- ✅ Acesso permitido a todas as telas
- ✅ Dados do usuário disponíveis

---

### 5. Teste de Persistência de Sessão

#### Cenário 5.1: Reabrir aplicativo
**Passos:**
1. Faça login
2. Feche o aplicativo
3. Abra novamente

**Resultado esperado:**
- ✅ Usuário continua logado
- ✅ Dados do usuário mantidos
- ✅ Vai direto para Home

#### Cenário 5.2: Recarregar página (Web)
**Passos:**
1. Faça login no navegador
2. Pressione F5 (recarregar)

**Resultado esperado:**
- ✅ Sessão mantida
- ✅ Não precisa fazer login novamente

---

## 🎯 Testes de Interface

### Visual
- [ ] Campos de input bem formatados
- [ ] Botões com loading states
- [ ] Cores consistentes (#007AFF para primário)
- [ ] Textos legíveis
- [ ] Espaçamentos adequados

### Responsividade
- [ ] Funciona em tela pequena (mobile)
- [ ] Funciona em tela grande (tablet/web)
- [ ] Teclado não sobrepõe campos
- [ ] ScrollView funciona em telas pequenas

### UX
- [ ] Feedback visual em todas as ações
- [ ] Mensagens de erro claras
- [ ] Loading durante operações
- [ ] Botões desabilitados durante loading
- [ ] Navegação intuitiva

---

## 🔧 Testes Técnicos

### Firebase
```bash
# Verificar se Firebase está inicializado
# Deve aparecer no console:
✅ Firebase inicializado com sucesso
```

### Logs de Autenticação
```bash
# Verificar logs no console do app
# Login:
- onAuthStateChanged: usuário logado
- uid: abc123...
- email: usuario@email.com

# Logout:
- onAuthStateChanged: usuário deslogado
- user: null
```

### Estados do Contexto
```typescript
// Usar React DevTools para verificar AuthContext:
{
  user: {
    uid: "abc123...",
    email: "usuario@email.com",
    displayName: "João Silva"
  },
  loading: false,
  isAuthenticated: true
}
```

---

## 🐛 Problemas Comuns e Soluções

### 1. "Firebase não inicializado"
**Solução:**
- Verifique o arquivo `.env`
- Confirme que as variáveis começam com `EXPO_PUBLIC_`
- Reinicie o servidor: `npm start`

### 2. "Email já está em uso" (mas não cadastrei)
**Solução:**
- Vá no Firebase Console > Authentication
- Exclua o usuário manualmente
- Tente novamente

### 3. "Network request failed"
**Solução:**
- Verifique sua conexão com internet
- Confirme que o Firebase está acessível
- Verifique regras de CORS (para web)

### 4. Navegação não funciona
**Solução:**
- Limpe cache: `npx expo start -c`
- Reinstale dependências: `rm -rf node_modules && npm install`
- Verifique se react-navigation está instalado

### 5. Tela branca após login
**Solução:**
- Verifique console para erros
- Confirme que AuthContext está envolvendo o app
- Verifique se as telas estão importadas corretamente

---

## 📊 Matriz de Testes

| Funcionalidade | Manual | Automático | Status |
|----------------|--------|------------|--------|
| Registro       | ✅     | ⏳         | ✅     |
| Login          | ✅     | ⏳         | ✅     |
| Logout         | ✅     | ⏳         | ✅     |
| Validações     | ✅     | ⏳         | ✅     |
| Rotas Protegidas| ✅    | ⏳         | ✅     |
| Persistência   | ✅     | ⏳         | ✅     |
| Erros          | ✅     | ⏳         | ✅     |

---

## ✨ Cenários de Teste Recomendados

### Ordem de Execução:
1. ✅ Registro de novo usuário
2. ✅ Logout
3. ✅ Login com usuário criado
4. ✅ Navegação entre telas
5. ✅ Logout novamente
6. ✅ Tentativa de login com credenciais erradas
7. ✅ Fechar e reabrir app
8. ✅ Verificar persistência

### Tempo estimado de testes: ~15-20 minutos

---

## 📝 Relatório de Testes

### Template:
```
Data: ___/___/___
Testador: __________
Plataforma: [ ] Web [ ] iOS [ ] Android

REGISTRO
[ ] Registro bem-sucedido
[ ] Validações funcionando
[ ] Erro de email duplicado

LOGIN
[ ] Login bem-sucedido
[ ] Validações funcionando
[ ] Erros exibidos corretamente

LOGOUT
[ ] Logout funcional
[ ] Redirecionamento correto

PROTEÇÃO
[ ] Rotas protegidas funcionando
[ ] Redirecionamento automático

PERSISTÊNCIA
[ ] Sessão mantida após reiniciar

INTERFACE
[ ] Design responsivo
[ ] Feedback visual adequado
[ ] Mensagens de erro claras

OBSERVAÇÕES:
_________________________________
_________________________________
_________________________________

Status Final: [ ] ✅ Aprovado [ ] ⚠️ Com ressalvas [ ] ❌ Reprovado
```

---

## 🚀 Próximos Passos Após Testes

Se todos os testes passarem:
1. ✅ Módulo 1 completo
2. ⏭️ Avançar para Módulo 3: Cadastro de Rendas
3. 📝 Documentar quaisquer bugs encontrados
4. 🔧 Corrigir problemas antes de continuar

---

**Boa sorte com os testes! 🎉**
