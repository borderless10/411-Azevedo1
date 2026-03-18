
1- Correção de detecção de contas vencidas (overdue)
🔹 Implementamos lógica robusta para detectar contas vencidas, inclusive para dados legados sem `dueDate`/`dueDay`.
🔹 Objetivos: garantir que contas criadas antes da função de overdue sejam identificadas corretamente; Decisões: usar `createdAt` como fallback e múltiplas tentativas de parsing (Timestamp/Date/string); Processo: adicionar checagens, logs e um passe legado para atualização persistente.
✔️ Benefícios:

- Melhora na consistência da interface, exibindo status correto para o usuário.
- Reduz inconsistências em dados antigos, evitando confusão para clientes e consultores.
- Facilita futuras automações de verificação de vencimentos.

2- Adição de logs diagnósticos nas rotinas de bills e planning
🔹 Inserimos logs detalhados em pontos críticos (`getPlanning`, mapeamento de bills e `updateOverdueBills`) para rastrear payloads e decisões.
🔹 Objetivos: permitir diagnóstico rápido de casos como bills sem `dueDate`; Decisões: logar raw/mapped e ramificações de decisão; Processo: adicionar mensagens com contexto e IDs.
✔️ Benefícios:

- Depuração simplificada com informações contextualizadas por documento.
- Registro histórico que ajuda a entender regressões e dados atípicos.

3- Persistência de status `overdue` em documentos de planejamento
🔹 Implementamos `syncOverduePlanningBills(userId)` que calcula e persiste `status: "overdue"` em planning.bills quando necessário.
🔹 Objetivos: tornar correções duráveis no backend do Firestore; Decisões: aplicar updates com merge/updates para não sobrescrever arrays; Processo: iteração, cálculo de dueDate (fallback createdAt), e gravação condicional.
✔️ Benefícios:

- Evita correções apenas em UI (transientes).
- Garante uniformidade entre dispositivos e sessões.

4- Ajuste no mapeamento de bills no cliente 
🔹 Alteramos `loadBills()` e criamos `getPlanningBillStatus()` para decidir status a partir do planning, considerando paidDate, dueDate/dueDay e createdAt fallback.
🔹 Objetivos: apresentar status correto no UI do usuário; Decisões: centralizar regra no componente e logar decisões; Processo: mapear planning.bills para modelo de Bill e aplicar conversões de data.
✔️ Benefícios:

- Interface mais previsível para o usuário final.
- Menor risco de exibir informação errada em listas de contas.

7- Implementação de fallback `createdAt` para cálculo de vencimento
🔹 Passamos a utilizar `createdAt` como data estimada quando `dueDate` e `dueDay` estiverem ausentes.
🔹 Objetivos: definir uma heurística confiável para dados antigos; Decisões: priorizar campos existentes (dueDate/dueDay) e usar createdAt somente como último recurso; Processo: implementar lógica no mapeamento e no sync.
✔️ Benefícios:

- Evita que documentos antigos fiquem com status indefinido.
- Melhora acurácia das flags de vencimento sem necessidade de intervenção manual.

8- Atualização da Tela `Budget` (Consumo Moderado) para leitura do planejamento
🔹 Alteramos `src/screens/Budget/BudgetScreen.tsx` para exibir o valor mensal permitido como leitura apenas, vindo do planejamento do consultor (soma de `plannedByCategory`, `bills` e `expectedExpenses`).
🔹 Objetivos: impedir edição pelo cliente e garantir que o valor reflita o planejamento do consultor; Decisões: remover input editável e exibir `plannedMonthlySpending`; Processo: buscar planning, calcular somatórios e atualizar UI com styles read-only.
✔️ Benefícios:

- Coerência entre planejamento consultor/cliente.
- Evita sobrescrita acidental do valor planejado pelo cliente.


13- Testes manuais e validação local das mudanças
🔹 Executamos ciclos de validação local: navegar nas telas afetadas, simular bills legados e observar logs para confirmar status e persistência.
🔹 Objetivos: garantir que alterações não quebrem fluxo usuário; Decisões: priorizar testes manuais para cenários reais; Processo: reproduzir bug relatado e validar correção.
✔️ Benefícios:

- Confiança nas correções antes de publicar.
- Feedback imediato para ajustes rápidos.
