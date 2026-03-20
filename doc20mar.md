




1- Implementação do resumo esperado
🔹 Implementamos o componente de resumo esperado exibindo valores resumidos de gastos, rendas e poupança com dados vindos do serviço de planejamento.
🔹 Decidimos apresentar um cartão compacto por tipo (Gasto, Renda) com opção de expandir para ver detalhes.
🔹 Processo: leitura do `planningServices`, mapeamento de `expectedIncomes` e `expectedExpenses`, conversão de timestamps.
✔️ Benefícios:
Melhora a visibilidade financeira imediata para o usuário.
Permite decisões rápidas sem abrir telas adicionais.

2- Criação do componente `ExpectedDetails`
🔹 Criamos `ExpectedDetails` para renderizar a lista de itens esperados (label, valor, percentuais) e botão “Ver mais”.
🔹 Decisão técnica: componente independente e tema-aware (usa `ThemeContext`) para consistência visual.
🔹 Processo: componente isolado em `src/components/ui`, uso de `formatCurrency` e estilos reutilizáveis.
✔️ Benefícios:
Reuso do componente em outras telas (por ex. Planejamento).
Consistência visual e facilidade para ajustes de estilo centralizados.

3- Integração dos dados de planejamento na Home
🔹 Lemos `planningServices.getPlanning(userId)` e armazenamos `planningData` no estado da Home.
🔹 Decisão: gerar resumos (soma de despesas, soma de receitas, projeção poupança) no cliente para performance e flexibilidade.
🔹 Processo: handlers para mapear arrays, converter `Timestamp` para `Date`, calcular totais e percentuais.
✔️ Benefícios:
Dados atualizados na Home sem navegação extra.
Possibilidade de exibir múltiplos cortes (mensal, mensalizado) futuramente.

4- Controle de expansão: apenas um painel aberto
🔹 Implementamos `expanded` como string union (`"income" | "expense" | null`) para garantir que apenas um dropdown esteja aberto.
🔹 Decisão: substituir múltiplos painéis por estado único para evitar conflitos de layout.
🔹 Processo: função `toggleExpanded` com `LayoutAnimation` para transição suave.
✔️ Benefícios:
UX previsível — abrir um painel fecha o outro.
Evita renderizações duplicadas e efeitos visuais indesejados.

5- Refatoração para painel de detalhes full-width
🔹 Movemos a renderização dos detalhes para um único painel full-width abaixo da linha de cartões.
🔹 Decisão: separar conteúdo variável (detalhes) do contêiner dos cartões para evitar estiramento do cartão oposto.
🔹 Processo: ajuste de layout (remover flex assimétrico, adicionar wrapper full-width).
✔️ Benefícios:
Layout estável em diferentes larguras de tela.
Melhor controle visual ao expandir conteúdo.

6- Correção de erro de sintaxe JSX
🔹 Identificamos e corrigimos um fechamento de tag incorreto que causava erro de build.
🔹 Processo: revisão de JSX e testes rápidos de tipagem para garantir compilação.
✔️ Benefícios:
Restabeleceu build local e permitiu continuar implementação sem interrupções.

7- Estilização alinhada ao `ThemeContext`
🔹 Adaptamos as cores e tokens (primary, danger, card, text) nos novos componentes para manter identidade visual.
🔹 Decisão: usar `useTheme()` para pegar cores e aplicar dinamicamente nos estilos.
🔹 Processo: refatoração de estilos inline para objetos que consomem tokens de tema.
✔️ Benefícios:
Uniformidade visual e facilidade para suportar tema escuro/claro.
Menor duplicação de cores hard-coded.

8- Animações de transição com `LayoutAnimation`
🔹 Aplicamos `LayoutAnimation` nas transições de abrir/fechar detalhes para suavizar mudanças de altura.
🔹 Decisão: priorizar animações nativas simples sobre libs complexas por compatibilidade.
🔹 Processo: chamar `LayoutAnimation.configureNext` antes de alterar estado `expanded`.
✔️ Benefícios:
Transições mais agradáveis e menos bruscas para o usuário.

9- Ajustes de acessibilidade e touch targets
🔹 Garantimos que `TouchableOpacity` e botões possuam área de toque adequada e feedback visual.
🔹 Decisão: manter targets acima do mínimo recomendado e usar feedback de opacidade/elevação.
🔹 Processo: revisão de estilos e testes manuais de toque nos componentes modificados.
✔️ Benefícios:
Melhor usabilidade em dispositivos de diferentes tamanhos.
Redução de toques errados por alvos pequenos.

10- Tratamento de dados Firestore (Timestamp → Date)
🔹 Padronizamos a conversão de `Timestamp` vindo do Firestore para `Date` nos serviços de planejamento.
🔹 Decisão: centralizar a conversão em `planningServices` para evitar lógica repetida na UI.
🔹 Processo: mapear campos relevantes ao ler documentos e expor objetos prontos para consumo.
✔️ Benefícios:
Menor probabilidade de erros ao manipular datas na UI.
Código consumidor mais limpo e previsível.

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
