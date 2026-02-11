# 🔥 Índices Necessários no Firestore

## ⚠️ IMPORTANTE
O app funciona sem esses índices (usa fallback), mas a performance será melhor com eles criados.

---

## 📋 **ÍNDICE 1: Activities (Feed/Timeline)**

**Coleção:** `activities`

**Campos:**
- `userId` → Ascending
- `createdAt` → Descending

**Como criar:**
1. Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Collection ID: `activities`
4. Adicionar campos:
   - Field: `userId`, Order: Ascending
   - Field: `createdAt`, Order: Descending
5. Click "Create"

**OU use este link direto que aparece no erro:**
```
https://console.firebase.google.com/project/_/firestore/indexes?create_composite=...
```

---

## 📋 **ÍNDICE 2: Bills - Listagem Geral**

**Coleção:** `bills`

**Campos:**
- `userId` → Ascending
- `dueDate` → Ascending

**Como criar:**
1. Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Collection ID: `bills`
4. Adicionar campos:
   - Field: `userId`, Order: Ascending
   - Field: `dueDate`, Order: Ascending
5. Click "Create"

---

## 📋 **ÍNDICE 3: Bills - Filtro por Status**

**Coleção:** `bills`

**Campos:**
- `userId` → Ascending
- `status` → Ascending
- `dueDate` → Ascending

**Como criar:**
1. Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Collection ID: `bills`
4. Adicionar campos:
   - Field: `userId`, Order: Ascending
   - Field: `status`, Order: Ascending
   - Field: `dueDate`, Order: Ascending
5. Click "Create"

---

## 📋 **ÍNDICE 4: Bills - Contas do Dia**

**Coleção:** `bills`

**Campos:**
- `userId` → Ascending
- `status` → Ascending
- `dueDate` → Ascending

*Nota: Este é o mesmo índice #3, não precisa criar duplicado*

---

## 🔧 **Regras de Segurança Necessárias**

Adicione estas regras no Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Usuários
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Rendas
    match /incomes/{incomeId} {
      allow read, write: if request.auth != null && 
                            resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;
    }
    
    // Despesas
    match /expenses/{expenseId} {
      allow read, write: if request.auth != null && 
                            resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;
    }
    
    // Metas
    match /goals/{goalId} {
      allow read, write: if request.auth != null && 
                            resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;
    }
    
    // Orçamentos
    match /budgets/{budgetId} {
      allow read, write: if request.auth != null && 
                            resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;
    }
    
    // Atividades (Feed)
    match /activities/{activityId} {
      allow read, write: if request.auth != null && 
                            resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;
    }
    
    // Contas a Pagar
    match /bills/{billId} {
      allow read, write: if request.auth != null && 
                            resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## ✅ **Status dos Índices**

Marque conforme for criando:

- [ ] Activities (userId + createdAt)
- [ ] Bills - Listagem Geral (userId + dueDate)
- [ ] Bills - Filtro por Status (userId + status + dueDate)

---

## 🚀 **Verificando se os Índices estão Funcionando**

Após criar os índices, verifique no console do app:

✅ **Com índice:** Não aparecerá mensagem de fallback  
⚠️ **Sem índice:** Aparecerá: "Índice não encontrado, usando fallback"

---

## 📖 **Documentação Oficial**

- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
