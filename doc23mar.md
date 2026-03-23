
11- Refatoração incremental do `HomeScreen.tsx`
🔹 Reestruturamos `HomeScreen.tsx` para isolar construção de resumos, handlers de toggle e a UI dos cartões.
🔹 Decisão: separar responsabilidades (calcular dados vs. renderizar apresentação) dentro do mesmo arquivo para facilitar leitura.
🔹 Processo: extrair funções auxiliares (buildExpenseSummary, buildIncomeSummary) e reorganizar JSX.
✔️ Benefícios:
Manutenção facilitada e testes unitários mais simples para lógica de resumo.


14- Melhoria na experiência visual do cartão ativo
🔹 Ao selecionar um cartão, aumentamos levemente seu destaque (sombra, borda, ou escala leve) para indicar foco.
🔹 Decisão: emitir apenas mudança visual mínima para não quebrar grid.
🔹 Processo: adição de estilo `expectedCardSquareExpanded` que aplica cor e sombra discretas.
✔️ Benefícios:
Clareza visual sobre qual cartão está ativo.
Melhora na leitura do fluxo de interação.

17- Adição do indicador de expansão (setinha / chevron)
🔹 Adicionamos uma setinha (chevron) nos cartões de resumo para indicar que o cartão é expansível e para sinalizar o estado (aberto/fechado).
🔹 Decisão técnica: usar `Ionicons` para consistência com ícones existentes e posicionar o chevron no canto superior direito do cartão.
🔹 Processo: inserir `Ionicons` no JSX dos cartões `Gasto Esperado` e `Renda Esperada`, criar `chevronContainer` em estilos e alternar o ícone/rotação com base no estado `expanded`.
✔️ Benefícios:
Melhora a affordance — usuário entende que o cartão expande para mais detalhes.
Feedback visual imediato quando o painel está aberto (chevron rotacionado), aumentando a confiança na interação.
Implementação simples e reutilizável para outros cartões expansíveis no app.




1- Introdução do tipo `RankingPreference`

- Adicionamos o tipo `RankingPreference` definindo os valores possíveis: `participate`, `view_only`, `hidden`, `unset`.
  🔹 Objetivos, decisões e processo: definir um contrato tipado para representar a preferência do usuário sobre o uso do ranking e garantir validação em tempo de compilação. Decidimos usar uma união literal TypeScript para manter as opções explícitas.
  ✔️ Benefícios:

* Melhora a segurança de tipos ao manipular preferências de ranking.
* Facilita leitura e manutenção do código onde a preferência é consultada ou atualizada.
* Permite validação antecipada durante a compilação.

2- Adição do campo `rankingPreference` no `User`

- Atualizamos a interface `User` para incluir `rankingPreference?: RankingPreference` e manter `showInRanking` como fallback legado.
  🔹 Objetivos, decisões e processo: tornar a preferência parte do modelo de usuário mantendo compatibilidade com dados existentes; optamos por permitir null/undefined para suportar migração gradual.
  ✔️ Benefícios:

* Transição suave para o novo modelo de preferência sem quebrar usuários legados.
* Simplicidade para futuras consultas e filtros baseados na preferência.

4- Atualização dos endpoints/serviços de usuário

- Alteramos os mapeamentos em `userService` para ler e persistir `rankingPreference`, e ajustar `updateUserPreferences` para aceitar esse campo.
  🔹 Objetivos, decisões e processo: garantir persistência e leitura corretas da preferência em todas as operações do serviço (getUserById, getAllUsers, updateUserPreferences).
  ✔️ Benefícios:

* Persistência consistente das preferências do usuário no backend/firestore.
* API de serviço mais expressiva e preparada para futuros campos relacionados.

5- Filtragem por participação em `rankingServices`

- Modificamos a geração do ranking para incluir apenas usuários cuja preferência efetiva seja `participate` (quando aplicável).
  🔹 Objetivos, decisões e processo: garantir que apenas participantes sejam listados no ranking final; decisões de design priorizaram respeito à escolha do usuário.
  ✔️ Benefícios:

* Privacidade e escolha do usuário respeitadas na geração do ranking.
* Precisão dos resultados do ranking conforme as preferências declaradas.

6- Modal inicial de onboarding do Ranking (implementação original)

- Adicionamos um modal que aparecia na primeira vez que um usuário comum acessasse o Ranking, solicitando a escolha entre participar/visualizar/esconder.
  🔹 Objetivos, decisões e processo: criar fluxo de consentimento explícito; modal bloqueante para forçar escolha antes de visualizar a aba; integrar com `userService` para salvar a opção.
  ✔️ Benefícios:

* Melhora UX ao explicar opções antes de expor o ranking.
* Garante que usuários novatos façam uma escolha consciente.

7- Ajuste do modal: seleção + botão "Salvar"

- Alteramos o comportamento do modal para que cliques apenas selecionem a opção; o usuário precisa clicar em um botão "Salvar" para persistir a preferência.
  🔹 Objetivos, decisões e processo: permitir que o usuário troque de opção antes de confirmar; implementamos estado local `selectedPreference` e `isSaving`, destaque visual da opção selecionada e botão de ação.
  ✔️ Benefícios:

* Melhora a usabilidade (trocar seleção antes de salvar).
* Reduz entradas acidentais — o usuário confirma explicitamente a escolha.
* Mantém comportamento de redirecionamento quando `hidden` é salvo.

8- Atualização visual: destaque da opção selecionada

- Adicionamos estilos para marcar visualmente a opção escolhida (borda e fundo levemente colorido).
  🔹 Objetivos, decisões e processo: oferecer feedback visual imediato para a seleção; usamos classes de estilo condicionais no componente.
  ✔️ Benefícios:

* Feedback visual claro, reduzindo ambiguidade sobre a seleção atual.
* Consistência com o design existente do app.

9- Ocultar a aba Ranking no `Sidebar` quando `hidden`

- Alteramos o componente `Sidebar` para não exibir o item 'Ranking' para usuários com preferência efetiva `hidden` (aplicado apenas a usuários comuns).
  🔹 Objetivos, decisões e processo: respeitar a escolha do usuário e evitar navegação para área que ele optou por ocultar; limitamos o comportamento a `role` não-admin/consultor.
  ✔️ Benefícios:

* Melhor respeito à privacidade do usuário.
* Interface mais limpa para usuários que não desejam ver o ranking.

10- Preferências do Ranking em `Settings`

- Adicionamos um item em Configurações que abre um modal para atualizar as preferências do ranking (selecionar + Salvar), reutilizando a mesma modelagem de opções.
  🔹 Objetivos, decisões e processo: permitir que o usuário edite sua preferência sem precisar abrir a aba Ranking; modal espelha o fluxo do onboarding e chama `userService.updateUserPreferences` e `refreshUser()` após salvar.
  ✔️ Benefícios:

* Acesso centralizado às preferências do ranking.
* Permite alteração consciente em qualquer momento pelo usuário.
