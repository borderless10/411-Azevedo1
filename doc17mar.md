1- Correção de sobrescrita do planejamento

- Corrigi a lógica de persistência para evitar sobrescrever campos existentes ao salvar um planejamento.
- 🔹 Objetivos, decisões e processos:
  - Garantir que chamadas a `savePlanning` não removam arrays como `expectedIncomes` ou `bills`.
  - Decidimos usar `setDoc(..., { merge: true })` para mesclar payloads parciais no Firestore.
  - Sanitizamos o payload para não enviar valores `undefined` ao Firestore.
- ✔️ Benefícios:
  - Preservação de dados existentes no documento de planning.
  - Evita perda de rendas e despesas já cadastradas.
  - Reduz regressões relacionadas a gravações parciais.

3- Conversão de Timestamps para `Date` em `getPlanning`

- Convertemos campos aninhados do Firestore (como `bills`, `expectedIncomes` e `expectedExpenses`) de `Timestamp` para `Date` na camada de serviço.
- 🔹 Objetivos, decisões e processos:
  - Garantir que a UI receba objetos `Date` prontos para uso.
  - Mapear arrays e proteger contra campos ausentes.
- ✔️ Benefícios:
  - Evita erros de renderização e manipulação de datas na UI.
  - Simplifica cálculos e exibição de datas na camada de apresentação.

4- Implementação de `markBillAsPaidByClient` no `planningServices`

- Adicionei um método que permite ao cliente marcar uma `bill` do planning como paga (atualiza `status` e `paidDate`).
- 🔹 Objetivos, decisões e processos:
  - Atualizar apenas o item dentro do array de `bills` no documento do planning.
  - Registrar atividade (`activityServices.logActivity`) após a alteração.
- ✔️ Benefícios:
  - Permite fluxo realista onde o cliente confirma pagamento de contas recomendadas.
  - Mantém histórico de pagamento (`paidDate`) para relatórios e auditoria.

5- Criação do componente `SummaryCard`

- Desenvolvi um cartão reutilizável para exibir métricas (renda, gastos, poupança) no topo de telas.
- 🔹 Objetivos, decisões e processos:
  - Componente pequeno, estilizado com `useTheme` para respeitar cores do sistema.
  - Projetei props simples (`title`, `value`, `icon`, `color`) para fácil reutilização.
- ✔️ Benefícios:
  - UI mais consistente e reutilizável.
  - Facilita a inclusão de resumos em outras telas.

6- Criação do componente `DetailCard`

- Desenvolvi um cartão para separar visualmente itens de detalhe (contas, rendas, observações).
- 🔹 Objetivos, decisões e processos:
  - Mostrar `title`, `value` e `note` com destaque visual e cores do tema.
  - Aplicar espaçamento e bordas para leitura rápida.
- ✔️ Benefícios:
  - Melhora a escaneabilidade da tela de planejamento.
  - Ajuda o usuário a identificar rapidamente itens importantes.

7- Refatoração da tela de `PlanningViewScreen`

- Reestruturei a tela para exibir 3 cartões no topo (Renda, Gastos, Poupança) e seções de detalhes com `DetailCard`.
- 🔹 Objetivos, decisões e processos:
  - Calcular totais via `useMemo` incluindo `plannedByCategory` e items esperados.
  - Removi container cinza e usei cores do tema para consistência visual.
- ✔️ Benefícios:
  - Visual mais claro e alinhado com identidade do app.
  - Usuário obtém métricas imediatas e depois detalhes segmentados.

9- Refatoração da `BillsScreen` para comportamento por role

- Modifiquei `src/screens/Bills/BillsScreen.tsx` para carregar contas do planning quando o usuário for cliente, e manter o fluxo normal para consultores/admin.
- 🔹 Objetivos, decisões e processos:
  - Detectar `user.role` e alternar fonte de dados (`planningServices.getPlanning` ou `getBills`).
  - Mapear `Bill` do planning para o shape esperado pela tela.
- ✔️ Benefícios:
  - Clientes não criam/excluem contas; apenas veem e confirmam pagamento.
  - Consultores mantêm CRUD completo, preservando privilégios.

11- Integração com `activityServices` para logs de ações

- Registrei atividades relevantes (criação/atualização de planning, marcação de conta como paga) para alimentar feed/registro.
- 🔹 Objetivos, decisões e processos:
  - Inserir chamadas a `activityServices.logActivity` após operações críticas.
  - Tratar falhas de log como avisos, sem bloquear a operação principal.
- ✔️ Benefícios:
  - Histórico de ações disponível para cliente/consultor.
  - Suporte a notificações internas e trilhas de auditoria.
