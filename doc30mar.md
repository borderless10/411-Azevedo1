1- Correção de permissão para consultores
Implementamos a correção que permite que consultores editem investimentos de clientes ao navegar para a tela adequada.
🔹 Objetivos/Decisões/Processos: Ajustar rota condicional em `ClientDetail` para redirecionar consultores à tela de edição em vez da tela somente-visualização; validar roles no fluxo de navegação.
✔️ Benefícios:

- Permite ações de consultoria diretamente na interface do cliente.
- Alinha permissões com regras de negócio.
- Reduz retrabalho e chamadas de suporte.

2- Projeto e implementação do módulo "Cartões"
Desenvolvemos o módulo de cartões de crédito com CRUD, visualização de faturas e integração com gastos.
🔹 Objetivos/Decisões/Processos: Criar tipos, serviços, utilitários e telas; decidir por persistência em Firestore e integração com `expenseServices` para atribuição de fatura.
✔️ Benefícios:

- Centraliza gerenciamento de cartões no app.
- Usuários podem ver faturas por cartão ou consolidadas.
- Permite expansão futura (parcelas, integrações bancárias).

3- Definição do modelo de dados para cartões
Criamos os tipos `CreditCard`, `CreateCreditCardData`, `UpdateCreditCardData`, e as correspondentes formas Firestore.
🔹 Objetivos/Decisões/Processos: Incluir campos `bestDay`, `cardExpiryMonth`, `cardExpiryYear`, `invoiceDueDay`, `autoDebit`, `lastAutoDebitInvoiceKey` e conversores entre Firestore e app.
✔️ Benefícios:

- Tipagem clara reduz erros em tempo de compilação.
- Facilita leitura/gravação consistente no Firestore.
- Torna possível regras avançadas (débito automático, faturas).

4- Utilitário de fatura e cálculo de invoice key
Implementamos `creditCardUtils` com `getInvoiceKeyForPurchase`, `getDueDateForInvoiceKey` e helpers.
🔹 Objetivos/Decisões/Processos: Definir regra de atribuição de compra para fatura com base em "Melhor dia" e normalizar chaves `YYYY-MM`.
✔️ Benefícios:

- Cálculo reprodutível e testável de faturas.
- Facilita agrupamento de despesas por fatura.
- Base sólida para automações (débito automático).

5- Regra de atribuição ajustada 
Alteramos a comparação para que compras no próprio `bestDay` rolem para a fatura seguinte.
🔹 Objetivos/Decisões/Processos: Mudar condição de `<=` para `<` em `getInvoiceKeyForPurchase` para atender regra de negócio solicitada; considerar comportamento esperado pelos usuários.
✔️ Benefícios:

- Comportamento previsível conforme solicitado.
- Evita surpresas na data de fechamento da fatura.

6- Normalização de datas para evitar timezone issues
Padronizamos as datas de compra para meio-dia local antes de calcular a fatura.
🔹 Objetivos/Decisões/Processos: Ao criar/atualizar gastos, ajustar `date.setHours(12,0,0,0)` para evitar mudanças de dia por timezone.
✔️ Benefícios:

- Previne alocação incorreta de faturas por problemas de fuso horário.
- Aumenta consistência em diferentes dispositivos/regiões.

7- Serviço `creditCardServices` (CRUD + faturas + débito automático)
Implementamos CRUD para cartões, agregação de faturas e rotina de débito automático idempotente.
🔹 Objetivos/Decisões/Processos: Validar payloads, consultar despesas, agrupar por invoiceKey, criar despesa de débito automático somente se não existir e atualizar `lastAutoDebitInvoiceKey`.
✔️ Benefícios:

- Automatiza cobrança quando configurado pelo usuário.
- Evita duplicidade com checagem idempotente.
- Oferece resumo consolidado de faturas para o usuário.

8- Integração com `expenseServices` (atribuição de invoiceKey)
Atualizamos `expenseServices` para calcular e gravar `invoiceYearMonth` quando método de pagamento for cartão.
🔹 Objetivos/Decisões/Processos: Ao criar/atualizar gastos, consultar cartão, calcular `invoiceYearMonth` via utilitário e persistir na despesa.
✔️ Benefícios:

- Gasto já é indexado na fatura correta.
- Facilita visualização de faturas por cartão.
- Mantém histórico consistente para relatórios.

9- Conversores Firestore aprimorados
Aprimoramos `convertCreditCardFromFirestore` e `convertCreditCardToFirestore` para mapear expiry, `bestDay` e timestamps corretamente.
🔹 Objetivos/Decisões/Processos: Garantir que campos ausentes em registros antigos recebam fallback seguro (p.ex. `cardExpiryYear` padrão); converter `Timestamp`↔`Date`.
✔️ Benefícios:

- Backward compatibility com registros existentes.
- Reduz erros de leitura/escrita.
- Facilita migrações incrementais.

10- Tela `CardsScreen` (UI/UX)
Criamos a tela de cartões com resumo de faturas, listagem de cartões e modal de cadastro/edição.
🔹 Objetivos/Decisões/Processos: Implementar ScrollView, modal com `KeyboardAvoidingView`, máscaras para campos, chips de filtro por cartão/janela temporal e ações CRUD.
✔️ Benefícios:

- UX consistente em dispositivos móveis.
- Campos atingíveis com teclado aberto (melhora usabilidade).
- Permite filtragem rápida por cartão e período.

14- Débito automático (checkbox) no cadastro
Alteramos o controle de `autoDebit` para um checkbox visual no modal, com persistência no `autoDebit` do cartão.
🔹 Objetivos/Decisões/Processos: Substituir `Switch` por checkbox estilizado que abrange o texto e altera estado ao tocar; persistir no Firestore.
✔️ Benefícios:

- Interface mais clara para o usuário ativar débito automático.
- Minimiza toque acidental em controles pequenos.
