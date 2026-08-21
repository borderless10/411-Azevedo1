# Relatório de Fase — App Visão (Borderless)

**Data:** 19/08/2026  
**Branch de referência:** alterações locais (não publicadas em novo EAS Update nesta entrega)  
**Último EAS Update conhecido:** branch `preview`, runtime `1.0.0` (alinhamento telas de renda)

---

## 1. Objetivo deste documento

Apoiar a **reunião de validação com o cliente** (Felipe / equipe), cruzando os **27 itens do PDF de testes** com o estado atual do código, indicando o que está pronto para testar, o que foi implementado nesta fase e o que ainda exige QA ou próxima sprint.

**Contas demo sugeridas para testes:**

| Perfil    | E-mail               | Senha  |
|-----------|----------------------|--------|
| Admin     | admin@gmail.com      | 123456 |
| Consultor | consultor@gmail.com  | 123456 |
| Cliente   | usuario@gmail.com    | 123456 |
| Cliente   | sabrina@gmail.com    | 123456 |

---

## 2. Resumo executivo

| Status | Quantidade (estimada) | Descrição |
|--------|----------------------|-----------|
| ✅ Validado pelo cliente (PDF) | 6 itens | #1, #2, #4, #5, #26, #27 marcados OK |
| ✅ Implementado / pronto para revalidar | ~18 itens | Correções entregues no código |
| 🟡 Parcial / depende de QA em dispositivo | ~5 itens | Lógica existe; precisa reproduzir cenário real |
| 🔴 Pendente ou fora de escopo imediato | ~4 itens | Persistência zeros renda, casos edge, publish |

**Destaques desta fase:**

- Ranking retroativo alinhado às regras do Felipe (Consumo Moderado).
- Telas de **renda** no padrão visual de Consumo Moderado / Mercado.
- **Recursos Disponíveis** (Em conta + rendas) no planejamento consultor e visão cliente.
- **Metas** com opção sem valor e status **Fora dos planos**.
- **Split dinheiro/cartão** visível na visão de planejamento do cliente.
- Atalhos do consultor para **Consumo Moderado** e **Rendas** em modo espectador.

---

## 3. Mapa item a item (PDF de testes)

Legenda: **OK-PDF** = cliente marcou OK no relatório | **NOVO** = entregue nesta fase | **QA** = testar manualmente

| # | Tema | Status | Notas para validação |
|---|------|--------|----------------------|
| 1 | Layout / navegação geral | OK-PDF | Revalidar após updates |
| 2 | Sidebar / menu | OK-PDF | — |
| 3 | Ranking retroativo (CM) | NOVO | Gasto hoje/ontem = 1 pt; zero hoje/ontem = 2 pts; 2+ dias = 0 pt; sem recálculo em dia já pontuado |
| 4 | Consumo Moderado — layout | OK-PDF | Dashboard + calendário |
| 5 | Zeros CM — confirmação | OK-PDF | Modal + feedback de pontos |
| 6 | Recursos Disponíveis / Em conta | NOVO | Aba Rendas (consultor): total, em conta, tooltip; cliente vê em Planejamento |
| 7 | Notificações / lembretes | QA | Serviço existe; validar push no aparelho |
| 8 | Gastos acompanhados — layout | Implementado | Padrão CategoryBudget |
| 9 | Registrar gasto acompanhado | Implementado | — |
| 10 | Contas a pagar | Implementado | — |
| 11 | Editar / excluir gastos | Implementado | — |
| 12 | Planejamento consultor — gastos | Implementado | Split cartão/dinheiro na edição |
| 13 | Cartões / faturas | Implementado | — |
| 14 | Ciclo de planejamento | Implementado | Renovação de ciclo |
| 15 | Home — resumo | Implementado | — |
| 16 | Meta sem valor financeiro | NOVO | Toggle "Com valor / Sem valor" ao criar meta |
| 17 | Meta "Fora dos planos" | NOVO | Botão consultor + filtro; histórico preservado |
| 18 | Consultor — visão espectador CM/rendas | NOVO | ClientDetail → Consumo Moderado, Rendas do Cliente, Registros |
| 19 | Zeros renda acompanhada | Parcial | UI alinhada; persistência Firestore ainda local em alguns fluxos |
| 20 | Ranking — tela / regras | NOVO | Texto das regras atualizado; confete condicional |
| 21 | Contas planejadas somem no registrar gasto | Parcial | Fallback de ID para gastos esperados legados; QA com dados reais |
| 22 | Rendas — lista / layout | Implementado | IncomeListScreen no padrão Budget |
| 23 | Split dinheiro/cartão visível ao cliente | NOVO | PlanningViewScreen exibe "Dinheiro: X · Cartão: Y" |
| 24 | Renda acompanhada — histórico | Implementado | TrackedIncomeScreen |
| 25 | Duplicidade / inconsistência contas | QA | Relacionado ao #21; testar cadastro → registrar → pagar |
| 26 | (item PDF) | OK-PDF | Conforme feedback cliente |
| 27 | (item PDF) | OK-PDF | Conforme feedback cliente |

---

## 4. Regras de negócio — Ranking (Consumo Moderado)

Escopo: **apenas Consumo Moderado** pontua no ranking.

| Situação | Pontos | Observação |
|----------|--------|------------|
| Gasto registrado no **mesmo dia** | 1 | Tipo `expense_same_day` |
| Gasto registrado **no dia seguinte** (ontem hoje) | 1 | Tipo `expense_next_day` |
| **Zero confirmado** no mesmo dia | 2 | Tipo `zero_same_day` |
| **Zero confirmado** no dia seguinte | 2 | Tipo `zero_next_day` |
| **2+ dias** de atraso | 0 | Sem celebração enganosa |
| Dia **já pontuado** editado | Não recalcula | Mantém entrada original |
| **2 dias seguidos** sem registro | Ambos 0 pt | `applyMissedPenalties` |

**Onde testar:** Home → registrar gasto CM; Budget → zero; Ranking → histórico e total.

---

## 5. Recursos Disponíveis (#6)

**Consultor** (`ClientPlanningScreen` → aba **Rendas**):

- Card **Recursos Disponíveis** = Em conta + Rendas esperadas.
- Campo **Em conta** com botão Salvar e ícone de ajuda (tooltip).
- Rodapé fixo: Recursos disponíveis | Gastos esperados | Poupança esperada.

**Cliente** (`PlanningViewScreen`):

- Resumo **Recursos Disponíveis** no topo.
- Linhas **Em conta** e **Rendas esperadas** quando houver valor.
- Poupança = Recursos − Gastos esperados.

**Compatibilidade:** leitura usa `availableInAccount`; fallback legado `monthlyIncome`.

---

## 6. Metas (#16 e #17)

| Funcionalidade | Como validar |
|----------------|--------------|
| Meta sem valor | Consultor → Metas → Nova Meta → "Sem valor" → salvar sem R$ |
| Meta com valor | Toggle "Com valor" + valor obrigatório |
| Fora dos planos | Na meta ativa → botão "Fora dos planos" → filtro correspondente |
| Histórico | Contribuições e valores anteriores permanecem no documento |

---

## 7. Visão consultor — espectador (#18)

Em **Detalhe do Cliente** (`ClientDetail`):

- **Consumo Moderado** → `Budget` com `clientId` (somente leitura).
- **Rendas do Cliente** → `IncomeList` com `clientId`.
- **Registros de Gastos / Rendas** → telas dedicadas de histórico.

---

## 8. Split dinheiro / cartão (#23)

Utilitário `planningDisplayUtils.ts`:

- Exibe valores separados quando `amountCard` + `amountCash` existem.
- Caso contrário, infere pelo `paymentMethod`.

**Onde ver:** Cliente → Planejamento → detalhes de gastos e rendas.

---

## 9. Roteiro sugerido para a reunião (45–60 min)

### Bloco A — Cliente (15 min)

1. Login `usuario@gmail.com` → Home e sidebar.
2. Consumo Moderado: registrar gasto hoje; confirmar zero ontem; ver feedback de pontos.
3. Ranking: conferir pontuação e texto das regras.
4. Planejamento: Recursos Disponíveis, split dinheiro/cartão nos itens.
5. Rendas: lista + acompanhamento diário (layout).

### Bloco B — Consultor (15 min)

1. Login `consultor@gmail.com` → selecionar cliente.
2. Planejamento → Rendas → Em conta + rendas → poupança esperada.
3. Detalhe cliente → Consumo Moderado / Rendas (modo espectador).
4. Metas → criar sem valor; marcar meta "Fora dos planos".

### Bloco C — Regressão (15 min)

1. Registrar gasto em conta planejada (`AddExpense` → conta do planejamento).
2. Gasto acompanhado (Mercado/Uber): zero e registro.
3. Contas a pagar: marcar paga e verificar sumário.

### Bloco D — Fechamento (5 min)

- Itens OK-PDF que regrediram?
- Prioridade da próxima sprint: zeros renda Firestore, notificações, publish EAS.

---

## 10. Arquivos principais alterados (referência técnica)

| Área | Arquivos |
|------|----------|
| Ranking | `rankingPlanilhaService.ts`, `budgetServices.ts`, `BudgetScreen.tsx`, `HomeScreen.tsx`, `RankingScreen.tsx` |
| Recursos Disponíveis | `planning.ts`, `planningServices.ts`, `ClientPlanningScreen.tsx`, `PlanningViewScreen.tsx` |
| Metas | `goal.ts`, `goalServices.ts`, `MetasScreen.tsx` |
| Split cliente | `planningDisplayUtils.ts`, `PlanningViewScreen.tsx` |
| Consultor | `ClientDetail.tsx`, `ClientIncomeRecordsScreen.tsx` |
| Contas planejadas | `AddExpenseScreen.tsx` (IDs estáveis) |
| Rendas | `IncomeListScreen.tsx`, `TrackedIncomeScreen.tsx` |

---

## 11. Pendências conhecidas (próxima entrega)

1. **Persistência de zeros de renda** acompanhada no Firestore (hoje parcialmente local).
2. **Publicar EAS Update** na branch `preview` após validação interna.
3. **QA #7** notificações em dispositivo físico.
4. **QA #21/#25** com planejamentos legados sem `id` em expectedExpenses.
5. Erros TypeScript pré-existentes no repo (chat, ConsumoModeradoScreen export, etc.) — não bloqueiam runtime Expo em geral, mas convém higienizar.

---

## 12. Comandos úteis pós-validação

```bash
# Login Expo (conta borderlesspc2)
npx eas login

# Publicar update OTA
npx eas update --branch preview --message "Fase validação: ranking, recursos, metas, split"

# Typecheck local
npx tsc --noEmit
```

---

## 13. Critérios de aceite sugeridos para fechar a fase

- [ ] Cliente confirma ranking (#3) com 3 cenários (hoje, ontem, atraso).
- [ ] Recursos Disponíveis bate com planilha manual (#6).
- [ ] Meta sem valor e Fora dos planos (#16, #17) aprovados pelo Felipe.
- [ ] Cliente vê split dinheiro/cartão no planejamento (#23).
- [ ] Consultor acessa CM e rendas do cliente sem editar (#18).
- [ ] Nenhuma regressão nos itens OK-PDF (#1, #2, #4, #5, #26, #27).

---

*Documento gerado para suporte à reunião de validação. Atualizar após feedback do cliente.*
