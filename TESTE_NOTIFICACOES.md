# 🔔 GUIA DE TESTE - NOTIFICAÇÕES

## ✅ CORREÇÕES APLICADAS

### **1. Máscara de Data Corrigida**
- ❌ Antes: Aceitava vírgula e formato errado
- ✅ Agora: Máscara automática DD/MM/YYYY
- ✅ Limita a 10 caracteres
- ✅ Aceita apenas números
- ✅ Formata automaticamente com /

---

## 🧪 COMO TESTAR AS NOTIFICAÇÕES

### **📱 REQUISITOS:**
- Dispositivo físico (não funciona em simulador)
- Permissões de notificação concedidas
- App em primeiro ou segundo plano

---

## 🔔 **TESTE 1: Notificação de Conta a Vencer**

### **Passo a Passo:**

1. **Abrir tela "Contas a Pagar"**
   - Sidebar → Contas a Pagar

2. **Criar uma conta para AMANHÃ:**
   - Clicar no botão + (FAB)
   - Título: "Teste Conta"
   - Valor: 100
   - Data: (amanhã no formato DD/MM/YYYY)
   - Clicar em "Cadastrar Conta"

3. **Verificar logs no console:**
   ```
   ✅ Notificação agendada para [DATA] 09:00:00
      Conta: Teste Conta - R$ 100.00
      ID: [NOTIFICATION_ID]
   ```

4. **Aguardar até amanhã às 9h:**
   - Notificação deve aparecer: "💰 Conta a vencer hoje!"
   - Corpo: "Teste Conta - R$ 100.00"

### **Teste Rápido (Opcional):**
Para testar imediatamente, modifique temporariamente o código:
```typescript
// Em notificationServices.ts, linha ~74
notificationDate.setHours(9, 0, 0, 0); // TROCAR POR:
notificationDate.setMinutes(new Date().getMinutes() + 1); // 1 minuto
```

---

## 📝 **TESTE 2: Lembrete Diário (21h)**

### **Cenário A: SEM gasto registrado hoje**

1. **Abrir "Consumo Moderado"**
   - Sidebar → Consumo Moderado

2. **NÃO registrar gasto do dia atual**

3. **Verificar logs:**
   ```
   ✅ Permissão de notificações concedida
   ✅ Lembrete diário agendado para 21h (todos os dias)
      Próxima notificação: [DATA] 21:00:00
      ID: [NOTIFICATION_ID]
   ✅ Lembrete diário configurado com sucesso
   ```

4. **Aguardar até 21h:**
   - Notificação: "📝 Lembrete de Gastos"
   - Corpo: "Não se esqueça de registrar seus gastos do dia!"

### **Cenário B: COM gasto registrado hoje**

1. **Abrir "Consumo Moderado"**

2. **Registrar gasto do dia atual:**
   - Clicar no dia de hoje
   - Digitar valor (ex: 50)
   - Clicar em ✓

3. **Verificar logs:**
   ```
   ✅ Gasto diário salvo no Firebase
   🔕 Lembrete diário cancelado (gasto registrado)
   ```

4. **Resultado:**
   - Notificação das 21h NÃO será enviada hoje
   - Será reagendada automaticamente para amanhã

---

## 🔍 **VERIFICAR NOTIFICAÇÕES AGENDADAS**

### **No Console do App:**

Procure por estes logs ao abrir as telas:

#### **Contas a Pagar:**
```
✅ Notificação agendada para [DATA]
   Conta: [TÍTULO] - R$ [VALOR]
   ID: [ID]
```

#### **Consumo Moderado:**
```
✅ Lembrete diário agendado para 21h (todos os dias)
   Próxima notificação: [DATA] 21:00:00
   ID: [ID]
```

---

## 🎯 **FLUXOS COMPLETOS**

### **Fluxo 1: Criar e Pagar Conta**
1. Criar conta para amanhã → ✅ Notificação agendada
2. Marcar como paga → 🔕 Notificação cancelada
3. **Log esperado:** "Notificação cancelada"

### **Fluxo 2: Criar e Excluir Conta**
1. Criar conta → ✅ Notificação agendada
2. Excluir conta → 🔕 Notificação cancelada
3. **Log esperado:** "Notificação cancelada"

### **Fluxo 3: Registrar Gasto Diário**
1. Abrir Consumo Moderado → ✅ Lembrete agendado (21h)
2. Registrar gasto do dia → 🔕 Lembrete cancelado
3. **Log esperado:** "Lembrete diário cancelado (gasto registrado)"

### **Fluxo 4: Sem Gasto no Dia**
1. Abrir Consumo Moderado → ✅ Lembrete agendado
2. Não registrar gasto → ⏰ Aguardar 21h
3. **Resultado:** Notificação enviada às 21h

---

## ⚠️ **PROBLEMAS COMUNS**

### **Notificação não aparece:**
- ✅ Verificar se é dispositivo físico
- ✅ Verificar permissões nas configurações do celular
- ✅ Verificar se o app não está em modo "Não perturbe"
- ✅ Verificar logs no console

### **Data inválida:**
- ✅ Usar formato DD/MM/YYYY
- ✅ Máscara aplica automaticamente
- ✅ Exemplo: 15022026 → 15/02/2026

### **Lembrete não cancela:**
- ✅ Verificar se registrou gasto no dia ATUAL
- ✅ Verificar logs: "Lembrete diário cancelado"
- ✅ Reabrir a tela para confirmar

---

## 📊 **CHECKLIST DE VALIDAÇÃO**

### **Notificações de Contas:**
- [ ] Criar conta para amanhã
- [ ] Ver log de agendamento
- [ ] Receber notificação às 9h
- [ ] Marcar como paga cancela notificação
- [ ] Excluir conta cancela notificação

### **Lembrete Diário:**
- [ ] Abrir Consumo Moderado sem gasto
- [ ] Ver log de agendamento (21h)
- [ ] Receber notificação às 21h
- [ ] Registrar gasto cancela lembrete
- [ ] Lembrete não envia se já tem gasto

---

## 🐛 **LOGS DE DEBUG**

### **Todos os logs implementados:**

#### **Sucesso:**
- ✅ Permissão de notificações concedida
- ✅ Notificação agendada para [DATA]
- ✅ Lembrete diário configurado com sucesso
- ✅ Gasto diário salvo no Firebase

#### **Avisos:**
- ⚠️ Permissão de notificações negada
- ⚠️ Data de vencimento já passou, notificação não agendada

#### **Cancelamentos:**
- 🔕 Lembrete diário cancelado (gasto registrado)
- 🔕 Notificação cancelada

#### **Erros:**
- ❌ Erro ao agendar notificação de conta
- ❌ Erro ao agendar lembrete diário
- ❌ Erro ao cancelar lembrete diário

---

## 🎉 **FUNCIONALIDADES IMPLEMENTADAS**

### ✅ **Máscara de Data:**
- Formato automático DD/MM/YYYY
- Aceita apenas números
- Limita a 10 caracteres

### ✅ **Notificação de Contas:**
- Agendada para 9h do dia de vencimento
- Cancela ao pagar
- Cancela ao excluir
- Não agenda se data já passou

### ✅ **Lembrete Diário:**
- Agendado para 21h (todos os dias)
- Cancela ao registrar primeiro gasto do dia
- Não agenda se já tem gasto
- Reagenda automaticamente para próximo dia

### ✅ **Logs Detalhados:**
- Todas as ações logadas
- Horários e IDs visíveis
- Erros específicos
- Fácil debug

---

## 📱 **TESTE FINAL COMPLETO**

1. **Instalar app no celular físico**
2. **Conceder permissões de notificação**
3. **Criar conta para amanhã às 9h**
4. **Abrir Consumo Moderado (sem gasto hoje)**
5. **Verificar logs de agendamento**
6. **Aguardar 21h → receber lembrete**
7. **Aguardar amanhã 9h → receber notificação de conta**
8. **Registrar gasto → lembrete cancela**
9. **Pagar conta → notificação cancela**

**TUDO FUNCIONANDO!** ✅
