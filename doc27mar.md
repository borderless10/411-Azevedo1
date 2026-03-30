1. Atualização do indicador "Sem registro" na tela de Orçamento (Budget)

- Substituí o ícone pequeno por um ícone de exclamação maior e com a cor rosa da marca, tornando-o mais visível nas linhas de dia.
- 🔹 Objetivos, decisões e processos: Aumentar a visibilidade dos dias sem registro; usar a cor da identidade visual; posicionar o ícone no final da linha para consistência com o layout existente; implementação no `BudgetScreen` usando Ionicons e estilos reutilizáveis.
- ✔️ Benefícios: Melhora na usabilidade para identificar dias pendentes; alinhamento visual com a identidade; redução de cliques para ações relacionadas.

2. Implementação de ações rápidas ao tocar no alerta de "Sem registro"

- Adicionei um modal de escolha que permite "Marcar zero na planilha" ou "Registrar gasto" diretamente a partir do dia sinalizado.
- 🔹 Objetivos, decisões e processos: Oferecer fluxo imediato para duas ações comuns; design com dois botões coloridos (roxo e rosa) para destacar prioridades; integração com navegação passando `params` para `AddExpense` quando escolhido registrar gasto.
- ✔️ Benefícios: Fluxos mais curtos para o usuário; menor fricção ao registrar ou marcar zero; consistência nas cores de ação.

3. Ação "Marcar zero" executada imediatamente sem confirmação extra

- Converti o fluxo para que tocar em "Marcar zero" efetue a marcação diretamente no Firestore e atualize o estado local.
- 🔹 Objetivos, decisões e processos: Remover confirmação redundante para acelerar o processo; chamar `budgetServices.confirmZeroExpenseDay(userId, date)` e atualizar `zeroConfirmedDays` localmente.
- ✔️ Benefícios: Redução de passos e tempo gasto pelo usuário; experiência mais fluida para rotinas repetitivas.

4. Prefill de data ao abrir a tela de cadastro de gasto (`AddExpense`)

- Adaptei `AddExpenseScreen` para aceitar `params.prefillDate` e preencher o campo de data automaticamente.
- 🔹 Objetivos, decisões e processos: Facilitar a criação de um gasto diretamente de um dia específico; enviar `prefillDate` ao navegar a partir do `BudgetScreen`.
- ✔️ Benefícios: Menos entrada manual, menor chance de erro de data, fluxo de registro mais eficiente.

5. Cálculo de média ajustado para considerar dias com gasto ou zero confirmado

- Modifiquei a fórmula para dividir o total apenas pelos dias "contados" (gasto>0 ou dia marcado como zero) em vez de todos os dias do mês até o momento.
- 🔹 Objetivos, decisões e processos: Fornecer uma média mais representativa; alterar lógica em `BudgetScreen` para computar `countedDays` e recalcular média.
- ✔️ Benefícios: Métricas mais precisas; melhor apoio à tomada de decisão do usuário.

6. Prevenção do prompt "Marcar zero" no primeiro dia de conta

- Adicionei verificação em `HomeScreen` para não exibir o prompt quando `user.createdAt` corresponde ao dia atual.
- 🔹 Objetivos, decisões e processos: Evitar prompts desnecessários para novos usuários; comparação por início do dia entre `createdAt` e hoje.
- ✔️ Benefícios: Melhor onboarding, menos interrupções iniciais, experiência amigável ao usuário novo.

8. Criação da feature "Lista de Desejos" (Wishlist)

- Adicionei `src/types/wishlist.ts` com `WishlistItem`, `WishlistFirestore`, `CreateWishlistData` e `UpdateWishlistData`.
- 🔹 Objetivos, decisões e processos: Definir contrato de dados para persistência no Firestore; manter tipagem consistente com o projeto (TypeScript).
- ✔️ Benefícios: Tipagem segura para serviços e telas; facilita manutenção e validação de dados.

9. Extensão dos helpers do Firestore para `wishlists`

- Atualizei `src/lib/firestore.ts` para incluir `WISHLISTS` na enum de coleções, helpers `getWishlistsCollection`/`getWishlistDoc` e conversores `convertWishlistFromFirestore` / `convertWishlistToFirestore`.
- 🔹 Objetivos, decisões e processos: Padronizar acesso ao Firestore; usar Timestamp/Date conversions já presentes; garantir compatibilidade com outros serviços.
- ✔️ Benefícios: Reuso consistente de utilitários; redução de duplicação ao acessar a coleção de wishlists.

13. Integração da nova tela à navegação e sidebar

- Atualizei `src/routes/NavigationContext.tsx` (type `ScreenName`) e `src/routes/Router.tsx` para registrar `Wishlist`; adicionei item no `Sidebar` (visível para clientes premium).
- 🔹 Objetivos, decisões e processos: Tornar a feature acessível via menu lateral; manter controle central de telas no `Router`.
- ✔️ Benefícios: Acesso consistente à funcionalidade via UI principal; compatibilidade com o flow de permissões do app.

15. Botão de "Lista de Desejos" adicionado em `ClientDetail` para consultores

- Incluí botão em `src/screens/Consultor/ClientDetail.tsx` que navega para `Wishlist` passando `clientId`.
- 🔹 Objetivos, decisões e processos: Permitir que consultores vejam desejos do cliente sem alterar permissões; reuso de `WishlistScreen` com leitura por `ownerId`.
- ✔️ Benefícios: Consultores têm visão completa das preferências financeiras do cliente; suporte a atendimento e recomendação personalizada.
