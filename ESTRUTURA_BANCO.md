# 🗄️ Estrutura do Banco de Dados - Firestore

## 📊 Coleções

### 1. `users`
Armazena informações dos usuários.

```typescript
{
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
}
```

---

### 2. `incomes` (Rendas/Entradas)
Armazena todas as rendas dos usuários.

```typescript
{
  id: string;              // ID do documento
  userId: string;          // Referência ao usuário
  value: number;           // Valor em reais
  description: string;     // Descrição da renda
  date: Timestamp;         // Data da renda
  category?: string;       // Categoria (opcional)
  createdAt: Timestamp;    // Data de criação
  updatedAt: Timestamp;    // Data de atualização
}
```

**Índices necessários:**
- `userId` + `date` (desc)
- `userId` + `createdAt` (desc)
- `userId` + `category` + `date` (desc)

---

### 3. `expenses` (Gastos/Despesas)
Armazena todos os gastos dos usuários.

```typescript
{
  id: string;              // ID do documento
  userId: string;          // Referência ao usuário
  value: number;           // Valor em reais
  description: string;     // Descrição do gasto
  date: Timestamp;         // Data do gasto
  category: string;        // Categoria (obrigatório)
  createdAt: Timestamp;    // Data de criação
  updatedAt: Timestamp;    // Data de atualização
}
```

**Índices necessários:**
- `userId` + `date` (desc)
- `userId` + `createdAt` (desc)
- `userId` + `category` + `date` (desc)

---

### 4. `categories` (Categorias)
Armazena categorias padrão e customizadas.

```typescript
{
  id: string;              // ID do documento
  name: string;            // Nome da categoria
  icon: string;            // Nome do ícone (Ionicons)
  color: string;           // Cor hex (#FF5733)
  type: 'income' | 'expense';  // Tipo
  isDefault: boolean;      // Se é padrão do sistema
  userId?: string;         // Null se padrão, userId se customizada
  createdAt: Timestamp;    // Data de criação
}
```

**Índices necessários:**
- `type` + `isDefault`
- `userId` + `type`

---

## 📐 Tipos TypeScript

### Tipos Principais

```
src/types/
├── user.ts           # Tipos de usuário
├── income.ts         # Tipos de renda
├── expense.ts        # Tipos de gasto
├── category.ts       # Tipos de categoria
├── transaction.ts    # Tipo genérico de transação
├── balance.ts        # Tipos de saldo/balanço
└── index.ts          # Exportação centralizada
```

### Helpers do Firestore

```
src/lib/
├── firebase.ts       # Configuração Firebase
└── firestore.ts      # Helpers e conversores
```

### Utilitários

```
src/utils/
├── dateUtils.ts      # Funções de data
└── currencyUtils.ts  # Funções de moeda
```

---

## 🔄 Conversores

### Data ↔ Timestamp

```typescript
// Date para Timestamp do Firestore
dateToTimestamp(date: Date): Timestamp

// Timestamp para Date
timestampToDate(timestamp: any): Date
```

### Income

```typescript
// Firestore → Aplicação
convertIncomeFromFirestore(data: IncomeFirestore): Income

// Aplicação → Firestore
convertIncomeToFirestore(income: Income): IncomeFirestore
```

### Expense

```typescript
// Firestore → Aplicação
convertExpenseFromFirestore(data: ExpenseFirestore): Expense

// Aplicação → Firestore
convertExpenseToFirestore(expense: Expense): ExpenseFirestore
```

---

## 🎨 Categorias Padrão

### Categorias de Renda (6)

| Nome | Ícone | Cor |
|------|-------|-----|
| Salário | `cash` | #4CAF50 (Verde) |
| Freelance | `briefcase` | #2196F3 (Azul) |
| Investimentos | `trending-up` | #9C27B0 (Roxo) |
| Presente | `gift` | #FF9800 (Laranja) |
| Venda | `cart` | #00BCD4 (Ciano) |
| Outros | `ellipsis-horizontal` | #607D8B (Cinza) |

### Categorias de Gasto (9)

| Nome | Ícone | Cor |
|------|-------|-----|
| Alimentação | `restaurant` | #FF5722 (Vermelho) |
| Transporte | `car` | #3F51B5 (Indigo) |
| Moradia | `home` | #795548 (Marrom) |
| Saúde | `medical` | #F44336 (Vermelho) |
| Educação | `school` | #009688 (Verde-água) |
| Lazer | `game-controller` | #E91E63 (Rosa) |
| Compras | `basket` | #FF9800 (Laranja) |
| Serviços | `construct` | #607D8B (Cinza) |
| Outros | `ellipsis-horizontal` | #9E9E9E (Cinza-claro) |

---

## 📊 Regras de Segurança do Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Função auxiliar para verificar autenticação
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Função auxiliar para verificar propriedade
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Usuários
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isOwner(userId);
      allow delete: if isOwner(userId);
    }
    
    // Rendas
    match /incomes/{incomeId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isOwner(resource.data.userId);
      allow delete: if isOwner(resource.data.userId);
    }
    
    // Gastos
    match /expenses/{expenseId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isOwner(resource.data.userId);
      allow delete: if isOwner(resource.data.userId);
    }
    
    // Categorias
    match /categories/{categoryId} {
      // Todos podem ler categorias padrão
      allow read: if isAuthenticated();
      // Só pode criar/atualizar/deletar suas próprias categorias
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 🔍 Exemplos de Queries

### Buscar rendas do usuário no mês atual

```typescript
import { 
  query, 
  where, 
  orderBy, 
  getDocs 
} from 'firebase/firestore';
import { getIncomesCollection } from './lib/firestore';
import { getFirstDayOfMonth, getLastDayOfMonth } from './utils/dateUtils';

const userId = auth.currentUser.uid;
const now = new Date();
const startOfMonth = getFirstDayOfMonth(now);
const endOfMonth = getLastDayOfMonth(now);

const q = query(
  getIncomesCollection(),
  where('userId', '==', userId),
  where('date', '>=', startOfMonth),
  where('date', '<=', endOfMonth),
  orderBy('date', 'desc')
);

const snapshot = await getDocs(q);
const incomes = snapshot.docs.map(doc => 
  convertIncomeFromFirestore({ id: doc.id, ...doc.data() })
);
```

### Buscar gastos por categoria

```typescript
const q = query(
  getExpensesCollection(),
  where('userId', '==', userId),
  where('category', '==', 'Alimentação'),
  orderBy('date', 'desc')
);
```

### Calcular total de gastos do mês

```typescript
const snapshot = await getDocs(q);
const total = snapshot.docs.reduce((sum, doc) => {
  return sum + doc.data().value;
}, 0);
```

---

## 📈 Otimizações

### 1. Paginação

```typescript
import { limit, startAfter } from 'firebase/firestore';

const ITEMS_PER_PAGE = 20;

const q = query(
  getIncomesCollection(),
  where('userId', '==', userId),
  orderBy('date', 'desc'),
  limit(ITEMS_PER_PAGE)
);

// Próxima página
const lastDoc = snapshot.docs[snapshot.docs.length - 1];
const nextQ = query(
  getIncomesCollection(),
  where('userId', '==', userId),
  orderBy('date', 'desc'),
  startAfter(lastDoc),
  limit(ITEMS_PER_PAGE)
);
```

### 2. Real-time Updates

```typescript
import { onSnapshot } from 'firebase/firestore';

const unsubscribe = onSnapshot(q, (snapshot) => {
  const incomes = snapshot.docs.map(doc => 
    convertIncomeFromFirestore({ id: doc.id, ...doc.data() })
  );
  setIncomes(incomes);
});

// Cleanup
return () => unsubscribe();
```

### 3. Cache

```typescript
import { getDocsFromCache, getDocsFromServer } from 'firebase/firestore';

// Tentar buscar do cache primeiro
try {
  const cached = await getDocsFromCache(q);
  setIncomes(cached.docs.map(...));
} catch {
  // Se não tiver cache, buscar do servidor
  const snapshot = await getDocsFromServer(q);
  setIncomes(snapshot.docs.map(...));
}
```

---

## ✅ Próximos Passos

1. ✅ **Estrutura criada** (tipos + helpers)
2. ⏳ **Criar serviços** (incomeServices.ts, expenseServices.ts)
3. ⏳ **Criar telas** (formulários e listagens)
4. ⏳ **Implementar cálculos** (financeServices.ts)
5. ⏳ **Criar dashboard** (DashboardScreen.tsx)

---

**📊 Estrutura de dados completa e pronta para uso!**

**Data de criação:** 14/01/2026  
**Versão:** 1.0.0  
**Status:** ✅ Completo
