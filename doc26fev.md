1- Implementação da Tela Inicial do Consultor
🔹 Implementamos a nova tela inicial voltada para o consultor, listando clientes, atalhos rápidos e métricas iniciais.
🔹 Decidimos exibir lista de clientes (role 'user'), indicadores de alertas e links para edição de planejamento e visão detalhada do cliente.
✔️ Benefícios:

- Visão imediata dos clientes e ações rápidas para o consultor.
- Redução de tempo para abrir o fluxo de planejamento de cada cliente.
- Facilidade para priorizar atendimentos e intervenções.

3- Criação de `ClientList` (lista de clientes)
🔹 Criamos a tela `ClientList` que pesquisa e exibe usuários do sistema com `role: 'user'` e fornece busca e seleção para abrir o planejamento ou detalhe do cliente.
🔹 Decisão: separar seleção de cliente da edição do planejamento para clareza de UX.
✔️ Benefícios:

- Melhor fluxo de trabalho: seleção rápida antes de editar.
- Menos complexidade na tela de edição do planejamento.

4- Separação do fluxo: `ClientPlanningScreen` como formulário
🔹 Refatoramos o fluxo de planejamento para que `ClientPlanningScreen` seja apenas o formulário, recebendo `clientId` via params.
🔹 Processo: mover lógica de seleção para `ClientList` e simplificar props e state no editor.
✔️ Benefícios:

- Código mais modular e de fácil manutenção.
- Reutilização do formulário em outros fluxos se necessário.

5- Integração do `consultantId` ao salvar planejamento
🔹 Ajustamos o `ClientPlanningEditor` para usar `useAuth()` e incluir `consultantId` (id do usuário autenticado) no payload ao salvar planning.
🔹 Decisão: garantir rastreabilidade de quem criou/alterou o planejamento.
✔️ Benefícios:

- Auditoria mais clara das ações do consultor.
- Possibilita relatórios por consultor posteriormente.

6- Criação de `ClientDetail` com totais mensais
🔹 Construímos a tela `ClientDetail` que apresenta totais mensais de receitas e despesas, agrupamento de movimentos por dia e resumo financeiro do mês vigente.
🔹 Processo incluiu chamadas a `expenseServices` e `incomeServices` para agregação por mês no cliente selecionado.
✔️ Benefícios:

- Consultor obtém visão temporal relevante (mês atual) ao invés de métricas acumuladas indefinidamente.
- Facilita análise e recomendações com base em comportamento recente.

7- Agrupamento de movimentos por dia
🔹 Implementamos agrupamento das transações (despesas e receitas) por dia do mês, exibindo seção para cada dia com itens listados.
🔹 Decisão: visualização por dia melhora a percepção de padrão de consumo.
✔️ Benefícios:

- Permite identificar dias de pico de gastos.
- Suporta conversas mais objetivas entre consultor e cliente.

8- Botão fixo “Enviar mensagem” e modal front-end
🔹 Adicionamos um botão fixo inferior em `ClientDetail` que abre um modal de envio de mensagem (front-end apenas), sem integrar backend de chat.
🔹 Implementamos posicionamento respeitando safe-area para evitar sobreposição com UI do sistema.
✔️ Benefícios:

- Fluxo de comunicação rápida entre consultor e cliente (provisório).
- Interface clara e não intrusiva, preparada para futura integração com serviço de mensagens.

10- Adição de `getUsersByRole` em `userServices`
🔹 Implementamos `getUsersByRole(role)` para consultar usuários no Firestore filtrando por papel (role).
🔹 Decisão: centralizar consultas por função para evitar repetição e facilitar futuras mudanças em regras de busca.
✔️ Benefícios:

- Reuso por outras telas administrativas.
- Simplicidade ao popular listas filtradas por papel.

11- Atualização do `Sidebar` para fluxo do consultor
🔹 Atualizamos `Sidebar` para mostrar itens relevantes ao consultor: atalho para `ClientList` e link para a tela inicial consultor.
🔹 Processo: ajustar handlers de navegação para considerar role e enviar para telas específicas.
✔️ Benefícios:

- Menus contextuais por função, reduzindo ruído para o consultor.
- Navegação mais intuitiva e alinhada ao papel do usuário.

12- Registro das novas rotas no `NavigationContext` e `Router`
🔹 Adicionamos os nomes das novas telas (`ConsultorHome`, `ClientList`, `ClientDetail`) em `NavigationContext` e registramos a renderização no `Router` para role consultor.
🔹 Processo: garantir que o redirecionamento por função e a navegação manual não conflitem.
✔️ Benefícios:

- Fluxos previsíveis por função.
- Facilita testes e depuração de navegação.

13- Correções de UX: safe-area e botão inferior
🔹 Ajustamos posicionamento de botões fixos para respeitar `safe-area` e evitar sobreposição com barras do sistema.
🔹 Decisão: utilizar hooks de insets (ou equivalente) para compatibilidade entre plataformas.
✔️ Benefícios:

- Melhora usabilidade em dispositivos com notch ou barras de gestos.
- Visual limpo sem elementos cortados.

17- Testes manuais e ajustes iterativos
🔹 Realizamos testes manuais nas telas alteradas, corrigindo problemas visuais e de navegação; priorizamos correções que impactam a jornada do consultor.
🔹 Processo: iterar sobre feedback visual e ajustar estilos/posicionamento.
✔️ Benefícios:

- Estabilidade percebida nas interações principais.
- Preparação para testes mais formais (automação) posteriormente.
