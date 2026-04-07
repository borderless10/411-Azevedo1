1. Correção da atualização dos totais ao editar Consumo Moderado
   🔹 Ajustamos o cálculo dos totais para reagir imediatamente às alterações de cartão e dinheiro no Consumo Moderado, incluindo os estados corretos nas dependências da computação.
   🔹 Definimos a atualização reativa como prioridade para eliminar diferença entre o valor digitado no modal e os cards de soma.
   🔹 Aplicamos a mudança na tela do consultor para garantir consistência visual durante a edição.
   ✔️ Benefícios:

- Totais atualizados em tempo real sem precisar trocar de tela.
- Redução de inconsistências entre modal e resumo financeiro.
- Experiência mais previsível para o consultor.

2. Implementação da entrada de duração ao renovar ciclo
   🔹 Implementamos o fluxo de renovação do ciclo com captura explícita de duração em dias antes de confirmar a ação.
   🔹 Estruturamos um modal dedicado para receber o valor e validar entrada maior que zero.
   🔹 Mantivemos a decisão de renovação manual, sem automação forçada de reinício.
   ✔️ Benefícios:

- Controle explícito do período do ciclo.
- Menos ambiguidades sobre duração ativa.
- Base correta para cálculo de meta diária.

3. Criação de edição da duração do ciclo atual sem reiniciar
   🔹 Criamos a ação de editar duração do ciclo em andamento sem resetar início/fim do ciclo.
   🔹 Separamos os fluxos de ação entre renovar ciclo e editar duração para evitar efeitos colaterais.
   🔹 Persistimos o novo valor apenas no campo de duração do planejamento.
   ✔️ Benefícios:

- Ajuste operacional rápido sem perda de contexto do ciclo atual.
- Maior flexibilidade para consultoria durante acompanhamento.
- Menor risco de reinício acidental.

---

15. Implementação de split de pagamento no planejamento de gastos (Cartão + Dinheiro/Pix)
    🔹 Implementamos no planejamento do consultor a capacidade de cadastrar um mesmo gasto com valores separados entre cartão e dinheiro/pix, no mesmo lançamento.
    🔹 Estruturamos os campos de split para registrar `amountCard` e `amountCash`, além de consolidar o total (`amount`) no item salvo.
    🔹 Definimos o processo para identificar automaticamente o método de pagamento como `split` quando ambos os valores forem maiores que zero.
    ✔️ Benefícios:

- Permite representar gastos reais com múltiplas formas de pagamento sem criar lançamentos duplicados.
- Aumenta a precisão do planejamento financeiro para cliente e consultor.
- Melhora a qualidade dos indicadores de total por meio de pagamento.

---

16. Estruturação do split no Consumo Moderado com entrada separada por origem de pagamento
    🔹 Implementamos o cadastro de Consumo Moderado com dois campos dedicados, permitindo informar separadamente o valor de cartão e o valor de dinheiro/pix.
    🔹 Organizamos a composição automática do total de consumo moderado a partir da soma dos dois componentes no momento de salvar.
    🔹 Aplicamos a persistência dos três dados no planejamento (`consumoModerado`, `consumoModeradoCard`, `consumoModeradoCash`) para manter rastreabilidade completa.
    ✔️ Benefícios:

- Visão detalhada de como o consumo foi distribuído por forma de pagamento.
- Maior transparência para análise de comportamento financeiro do cliente.
- Base mais confiável para acompanhamento de meta e tomada de decisão.

---

17. Ajuste das regras de cálculo para considerar split nos totais do planejamento
    🔹 Ajustamos os cálculos de totais no planejamento para somar corretamente os componentes de cartão e dinheiro/pix quando o lançamento estiver em split.
    🔹 Definimos a separação entre total de gastos no cartão e total de gastos em dinheiro/pix, sem perda do total consolidado.
    🔹 Aplicamos a regra tanto para contas quanto para gastos esperados e consumo moderado, mantendo consistência entre os blocos da tela.
    ✔️ Benefícios:

- Indicadores financeiros mais fiéis ao lançamento real de cada gasto.
- Evita distorções em resumos quando o pagamento é misto.
- Melhora a leitura gerencial do planejamento por origem de despesa.

4. Estruturação de estado e modal de duração no planejamento do consultor
   🔹 Adicionamos estados de controle para ação de duração, valor de entrada e visibilidade do modal na tela de planejamento do cliente.
   🔹 Organizamos o fluxo para abrir o modal já no modo correto (renovar ou editar).
   🔹 Validamos a transição de estado para refletir imediatamente a duração salva na interface.
   ✔️ Benefícios:

- Fluxo mais claro e guiado para o consultor.
- Código mais organizado para manutenção de regras de ciclo.
- Menos retrabalho no preenchimento da duração.

---

5. Persistência de consumoModeradoCycleDurationDays no serviço de planejamento
   🔹 Expandimos o serviço de planejamento para aceitar e gravar consumoModeradoCycleDurationDays nas operações de atualização e reinício.
   🔹 Centralizamos a regra de persistência no service layer para evitar duplicação entre telas.
   🔹 Garantimos retorno do campo atualizado após operações críticas.
   ✔️ Benefícios:

- Dado de duração consistente entre backend e frontend.
- Menor acoplamento de regras na camada de UI.
- Melhor confiabilidade em leituras futuras do ciclo.

---

6. Expansão do restartConsumptionCycle para receber duração
   🔹 Atualizamos o método de reinício de ciclo para receber duração em dias como argumento de negócio.
   🔹 Aplicamos a gravação conjunta do status do ciclo e duração no mesmo fluxo transacional.
   🔹 Preservamos o comportamento de reinício manual com feedback de sucesso/erro.
   ✔️ Benefícios:

- Operação de renovação mais completa em uma única ação.
- Redução de chamadas adicionais para ajustar duração.
- Menor chance de ciclo ativo sem metadado de período.

-

8. Correção do cálculo da meta diária ideal na tela de orçamento
   🔹 Corrigimos o cálculo da meta diária para priorizar a duração planejada do ciclo quando informada.
   🔹 Aplicamos fallback para dias do período apenas quando a duração planejada estiver ausente.
   🔹 Reforçamos a regra de negócio para casos como 1600/20 resultar em 80.
   ✔️ Benefícios:

- Meta diária aderente ao planejamento definido pelo consultor.
- Indicador mais confiável para decisão do cliente.
- Eliminação de distorções por divisão no período errado.

---

10. Diagnóstico da origem do fundo preto da logo da sidebar
    🔹 Investigamos o componente da sidebar e validamos o asset usado no topo para determinar origem visual do fundo preto.
    🔹 Confirmamos que o fundo preto está embutido na própria imagem, não em regra de estilo do código.
    🔹 Consolidamos a decisão técnica de correção via substituição de asset transparente.
    ✔️ Benefícios:

- Evita ajustes incorretos em CSS/StyleSheet.
- Direcionamento rápido da correção para design/asset.
- Economia de tempo em tentativas de workaround de UI.

---

11. Implementação de retorno contextual ao abrir AddExpense via Consumo Moderado
    🔹 Alteramos a navegação de Consumo Moderado para AddExpense enviando parâmetro de origem com returnTo.
    🔹 Definimos explicitamente o destino de retorno para preservar fluxo após salvar/cancelar.
    🔹 Padronizamos a passagem de contexto já no ponto de abertura do cadastro.
    ✔️ Benefícios:

- Navegação consistente com a intenção do usuário.
- Menor fricção no fluxo de registro por dia sem gasto.
- Redução de desvios para Home indevidos.

---

12. Adequação do AddExpense para respeitar destino de retorno
    🔹 Atualizamos a tela de cadastro de gasto para usar params.returnTo ao cancelar e ao fechar modal de sucesso.
    🔹 Mantivemos fallback para Home quando não houver origem definida.
    🔹 Garantimos que o comportamento continue compatível com entradas antigas do fluxo.
    ✔️ Benefícios:

- Fluxo de ida e volta previsível entre telas.
- Reuso da mesma tela de cadastro com navegação contextual.
- Menos retrabalho de navegação após cadastrar gasto.

---

14. Padronização adicional do retorno contextual no Budget
    🔹 Aplicamos o mesmo padrão de navegação contextual no fluxo de registro iniciado pela tela de orçamento.
    🔹 Enviamos returnTo no navigate para AddExpense nesse ponto de entrada.
    🔹 Mantivemos coerência entre módulos que usam o mesmo cadastro de gasto.
    ✔️ Benefícios:

- Experiência uniforme entre Consumo Moderado e Orçamento.
- Menos risco de regressão em rotas similares.
- Melhor consistência de produto em fluxos relacionados.

---
