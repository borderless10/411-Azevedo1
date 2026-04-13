1- Ajuste do fluxo de Adicionar Gasto
🔹 Implementamos a seleção de cartão na tela de Adicionar Gasto, garantindo envio de `cardId` quando o usuário escolhe pagamento por cartão.
🔹 Objetivos: corrigir perda de dados ao registrar gastos por cartão; Decisões: validar seleção de cartão quando o método for cartão; Processos: ajustar estado local, validar inputs e anexar `cardId` ao payload para `expenseServices.createExpense`.
✔️ Benefícios:

- Evita registros incompletos de despesas com cartão.
- Permite associação correta entre gasto e fatura do cartão.
- Melhora rastreabilidade e conciliação financeira.

2- Unificação do fluxo de pagamento de contas
🔹 Unimos o fluxo de pagamento de contas: ao pagar uma conta, criamos um gasto real e marcamos a conta como paga (suporte a contas gerenciadas por planning e por coleção direta).
🔹 Objetivos: manter consistência entre contas e lançamentos; Decisões: sempre criar um `expense` antes de marcar como pago; Processos: chamar `expenseServices.createExpense` e depois `planningServices.markBillAsPaidByClient` com fallback para `billServices.markBillAsPaid`.
✔️ Benefícios:

- Garante que o pagamento de conta reflita no histórico de gastos.
- Mantém sincronização entre módulos de contas e despesas.
- Evita discrepâncias em relatórios e dashboards.

3- Correção de cálculo no Painel (Home)
🔹 Separemos `gasto realizado` (soma de todas as despesas) de `saldo realizado` (renda menos despesas não-cartão), assegurando que gastos no cartão não reduzam o saldo realizado.
🔹 Objetivos: corrigir semântica contábil exibida ao usuário; Decisões: incluir cartão em gasto realizado, excluir do cálculo do saldo realizado; Processos: ajustar agregações no `HomeScreen`.
✔️ Benefícios:

- Relatórios financeiros mais fiéis à realidade (saldo vs. faturas).
- Usuário visualiza gastos em cartão sem penalizar saldo disponível.
- Facilita entendimento sobre obrigações futuras (faturas).

4- Adição de ações rápidas na Home
🔹 Adicionamos botões rápidos na Home para acessar rapidamente a lista de rendas e a lista de gastos.
🔹 Objetivos: melhorar navegação e eficiência; Decisões: criar cartões de ação com cores da identidade do app; Processos: inclusão de componentes interativos com navegação para `IncomeList` e `ExpenseList`.
✔️ Benefícios:

- Acesso mais rápido a listas frequentes.
- Melhora na experiência do usuário e fluxo de trabalho.
- Consistência visual com paleta do app.

5- Correção do cabeçalho de data em listas
🔹 Corrigimos o deslocamento de um dia no cabeçalho das listas (rendas/gastos) ao parsear chaves `YYYY-MM-DD` criando `new Date(year, month-1, day)` localmente.
🔹 Objetivos: eliminar erro de timezone ao agrupar itens por data; Decisões: evitar `new Date('YYYY-MM-DD')` que gera UTC; Processos: parse manual das partes e criação de Date local para exibição.
✔️ Benefícios:

- Datas exibidas condizem com os itens listados.
- Evita confusão do usuário sobre quando o evento ocorreu.
- Melhora a confiança nos resumos diários.

6- Permitir exclusão de itens em listas
🔹 Implementamos a opção de excluir rendas e gastos diretamente nas telas de lista, com confirmação via modal e feedback de carregamento.
🔹 Objetivos: oferecer controle e remoção de registros incorretos; Decisões: usar `Alert` para confirmar exclusão; Processos: chamar `incomeServices.deleteIncome` / `expenseServices.deleteExpense` e recarregar a lista.
✔️ Benefícios:

- Usuário corrige entradas erradas sem precisar de suporte.
- Fluxo seguro com confirmação para evitar exclusões acidentais.
- Interface mais completa e autônoma.

7- Exclusão de "Gastos Acompanhados" das agregações de Consumo Moderado
🔹 Filtramos gastos marcados como acompanhados para que não impactem o cálculo do Consumo Moderado.
🔹 Objetivos: separar despesas monitoradas manualmente das agregações automáticas; Decisões: aplicar filtro por flag ou categoria marcada como acompanhada; Processos: ajustar agregação em `BudgetScreen`.
✔️ Benefícios:

- Valores agregados refletem apenas o consumo moderado relevante.
- Evita inflar o consumo por itens que o usuário acompanha separadamente.
- Melhora clareza nas metas de consumo.

8- Novo destaque no Consumo Moderado: valor restante
🔹 Alteramos o destaque para mostrar quanto falta (expected - totalSpent), com clamp mínimo em 0 e mensagem vermelha quando excedido mostrando o valor excedente.
🔹 Objetivos: fornecer sinalização clara sobre margem disponível; Decisões: mostrar 0 quando negativo e exibir texto de alerta em vermelho com excesso; Processos: cálculo de `remainingToSpend = Math.max(0, expected - totalSpent)` e `overAmount = totalSpent - expected` quando > 0.
✔️ Benefícios:

- Usuário entende imediatamente quanto ainda pode gastar.
- Alerta visual para excessos que exigem atenção.
- Ajuda na tomada de decisão para correções orçamentárias.

9- Harmonização do tratamento de `paymentMethod`
🔹 Normalizamos os métodos de pagamento (cartão, dinheiro, etc.) para garantir comportamento consistente ao criar despesas a partir de diferentes fluxos.
🔹 Objetivos: padronizar payloads enviados ao backend; Decisões: mapear nomes e validações antes da criação; Processos: unificar mapeamento em helper/serviço.
✔️ Benefícios:

- Menos erros por valores inesperados no campo `paymentMethod`.
- Lógica centralizada facilita manutenção.
- Dados consistentes para relatórios e filtros.

10- Ajustes em `expenseServices.createExpense` (integração)
🔹 Asseguramos que a criação de despesa aceite e armazene corretamente metadados de cartão (ex.: `cardId`, `invoiceYearMonth`) quando aplicável.
🔹 Objetivos: suportar rastreamento de faturas e agrupamento por fatura; Decisões: incluir cálculo de `invoiceYearMonth` para despesas de cartão; Processos: extensão do payload na camada de serviço.
✔️ Benefícios:

- Permite relatórios por fatura de cartão.
- Facilita conciliação entre gastos e lançamentos do cartão.
- Suporte a futuras funcionalidades de parcelamento e fatura.

11- Fallback para marcar conta como paga
🔹 Implementamos fallback para marcar conta como paga tanto em `planning` quanto na coleção `bills`, garantindo compatibilidade com contas gerenciadas por consultoria e contas diretas.
🔹 Objetivos: robustez na atualização do estado de contas; Decisões: tentar `planningServices` e, em caso de erro ou ausência, usar `billServices.markBillAsPaid`; Processos: fluxo try/catch com fallback.
✔️ Benefícios:

- Evita falha silenciosa ao marcar contas pagas.
- Garante consistência independente da origem da conta.
- Reduz risco de dados fora de sincronia.

12- Refatoração mínima de UI para cores e consistência
🔹 Atualizamos estilos de botões e ações rápidas para aderir à paleta e identidade do aplicativo, mantendo contraste e acessibilidade.
🔹 Objetivos: reforçar identidade visual; Decisões: aplicar cores principais do app em componentes novos; Processos: ajuste de CSS/StyleSheet e revisão de contrastes.
✔️ Benefícios:

- Interface mais coesa e agradável.
- Melhora percepção de marca e usabilidade.
- Mantém contraste adequado para legibilidade.

13- Correção de edge-cases em datas e fuso
🔹 Reforçamos parsing e formatação de datas em utilitários reutilizados para evitar discrepâncias entre exibição e armazenamento.
🔹 Objetivos: evitar confusão por diferenças de timezone; Decisões: padronizar funções `formatDateForDisplay` e criação de `Date` local quando necessário; Processos: revisão de `dateUtils` e substituição de usos problemáticos.
✔️ Benefícios:

- Menos bugs relacionados a datas em listas e relatórios.
- Apresentação uniforme das datas no app.
- Redução de suporte por problemas de timezone.

14- Testes manuais e verificações estáticas
🔹 Realizamos checagens estáticas de tipos/erros nos arquivos modificados e testes manuais de fluxos-chave (criar gasto, pagar conta, excluir item, ver Home).
🔹 Objetivos: validar mudanças sem introduzir erros; Decisões: priorizar testes manuais nas áreas de impacto; Processos: rodar `lint`/checagens e testar telas no ambiente de desenvolvimento.
✔️ Benefícios:

- Menor probabilidade de regressões após deploy.
- Confiança nas alterações antes do QA mais amplo.
- Feedback rápido para ajustes pontuais.

15- Implementação de mensagens e feedback ao usuário
🔹 Adicionamos feedbacks visuais e loaders ao confirmar ações (ex.: ao excluir item ou pagar conta) para melhorar percepção de resposta do app.
🔹 Objetivos: melhorar UX durante operações assíncronas; Decisões: usar `ActivityIndicator` e `Alert` em pontos críticos; Processos: inserir estados de `isLoading` e mensagens contextuais.
✔️ Benefícios:

- Usuário sabe que a ação está sendo processada.
- Evita múltiplos envios acidentais por falta de feedback.
- Experiência mais profissional e previsível.

16- Recomendações futuras (técnicas e UX)
🔹 Sugerimos adicionar uma flag explícita `isTrackedExpense` ao modelo de despesa para facilitar filtragens e evitar ambiguidades com categorias; também sugerimos modal para escolher método ao pagar conta se o método não estiver definido.
🔹 Objetivos: endurecer modelo de dados e melhorar UX; Decisões: propor migração opcional e UI modal para escolha de método; Processos: planejar migração de dados e implementar modal condicional.
✔️ Benefícios:

- Filtragem mais robusta e menos frágil a nomes de categorias.
- UX mais clara ao pagar contas sem método predefinido.
- Menos necessidade de ajustes pontuais no futuro.

---

Observação: este arquivo registra as alterações e decisões realizadas desde o início do trabalho solicitado, organizado em tópicos de ação, objetivos, processos e benefícios. Evitei o termo solicitado e não incluí passos de criação de documentação fora do próprio arquivo de registro.
