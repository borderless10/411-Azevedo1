1. Estruturação do Consumo Moderado por Categoria
   Implementamos a base funcional para liberar e acompanhar o consumo moderado por categoria dentro do planejamento do cliente.
   🔹 Definimos o objetivo de permitir múltiplas categorias ativas ao mesmo tempo, cada uma com regras próprias de limite.
   🔹 Organizamos a solução para que o consultor controle a liberação e o cliente apenas acompanhe os resultados.
   🔹 Priorizamos compatibilidade com o fluxo já existente para evitar regressões nas telas anteriores.
   ✔️ Benefícios:
   Maior granularidade no acompanhamento de gastos.
   Controle mais preciso por categoria liberada.
   Evolução da funcionalidade sem quebrar o comportamento anterior.

---

2. Ampliação dos Tipos de Planejamento
   Expandimos as tipagens de planejamento para suportar releases por categoria e metadados de ciclo.
   🔹 Adicionamos novos contratos para categoria liberada, status, limites e informações de auditoria.
   🔹 Incluímos os novos campos nas estruturas usadas em leitura, gravação e atualização.
   🔹 Alinhamos os tipos para reduzir inconsistências entre frontend e persistência.
   ✔️ Benefícios:
   Maior segurança de tipos em todo o fluxo.
   Redução de erros de integração com Firestore.
   Base mais estável para manutenção futura.

---

3. Normalização de Categorias de Despesa
   Criamos utilitários de normalização para comparar categorias com segurança, mesmo com variações de acento e caixa.
   🔹 Padronizamos a transformação de strings para chave de comparação.
   🔹 Implementamos resolução para nome canônico de categoria.
   🔹 Validamos categorias apenas dentro do conjunto padrão de despesas.
   ✔️ Benefícios:
   Menos falhas por divergência textual.
   Comparações mais confiáveis em filtros e relatórios.
   Previsibilidade no vínculo entre release e gasto.

---

4. Persistência de Releases por Categoria no Serviço de Planejamento
   Evoluímos o serviço de planejamento para gravar e recuperar releases por categoria de forma consistente.
   🔹 Adicionamos mapeamento entre estrutura da aplicação e estrutura de Firestore.
   🔹 Tratamos valores inválidos e status padrão durante sanitização.
   🔹 Mantivemos regras de autorização por consultor dono do cliente.
   ✔️ Benefícios:
   Confiabilidade na leitura e escrita de releases.
   Dados mais limpos no banco.
   Governança de acesso preservada.

---

5. Gestão de Ciclo de Consumo Moderado
   Implementamos operações de ciclo para iniciar, encerrar e reiniciar períodos de acompanhamento.
   🔹 Reforçamos o uso de datas normalizadas para início e fim de ciclo.
   🔹 Vinculamos cálculo de metas diárias ao contexto de duração do ciclo.
   🔹 Mantivemos compatibilidade com telas que já usavam o ciclo global.
   ✔️ Benefícios:
   Controle temporal mais claro para o cliente.
   Melhor leitura de resultados por período.
   Coerência entre planejamento e execução.

---

6. Ajuste de Filtros de Categoria no Serviço de Gastos
   Atualizamos a lógica de consulta de despesas para usar comparação normalizada de categoria.
   🔹 Substituímos comparações frágeis por chave canônica.
   🔹 Garantimos aderência entre categoria liberada e despesas reais.
   🔹 Preservamos as demais regras de filtro já utilizadas no app.
   ✔️ Benefícios:
   Maior precisão nos totais por categoria.
   Menos divergências em cenários com nomes semelhantes.
   Melhor qualidade dos dados exibidos ao cliente.

---

7. Implementação da Gestão de Categorias Liberadas na Tela do Consultor
   Criamos o bloco de categorias liberadas na tela de planejamento do cliente no contexto do consultor.
   🔹 Inserimos ações de liberar, editar e desativar categoria.
   🔹 Exibimos limite mensal e meta diária para cada categoria ativa.
   🔹 Mantivemos o fluxo integrado ao restante do planejamento financeiro.
   ✔️ Benefícios:
   Operação mais prática para o consultor.
   Visual claro do que está ativo para cada cliente.
   Menor fricção para manutenção das regras de consumo.

---

9. Correção do Campo Monetário no Modal de Liberação
   Substituímos o campo monetário customizado por um componente já consolidado no app.
   🔹 Removemos formatação manual que interrompia digitação após poucos caracteres.
   🔹 Reaproveitamos o mesmo componente usado no cadastro de gastos.
   🔹 Alinhamos estado interno para trabalhar com valor numérico controlado.
   ✔️ Benefícios:
   Digitação estável de valores monetários.
   Consistência de comportamento entre modais.
   Menor risco de regressão em entradas financeiras.

---

10. Reorganização da Navegação da Sidebar para Cliente
    Restauramos o destino antigo do item Consumo Moderado e criamos uma seção nova para categorias acompanhadas.
    🔹 Mantivemos o link principal para a tela já conhecida pelo usuário.
    🔹 Adicionamos itens dinâmicos por categoria ativa na sidebar do cliente.
    🔹 Implementamos navegação com parâmetro de categoria para a nova tela dedicada.
    ✔️ Benefícios:
    Fluxo principal preservado para usuários atuais.
    Acesso rápido às categorias liberadas.
    Arquitetura de navegação mais clara.

---

11. Criação da Tela de Orçamento por Categoria para o Cliente
    Desenvolvemos uma tela específica por categoria, com visual e métricas no estilo da tela de orçamento.
    🔹 Exibimos meta mensal da categoria, média diária ideal e desempenho.
    🔹 Apresentamos lista diária de gastos filtrada pela categoria selecionada.
    🔹 Mantivemos integração com o ciclo ativo de consumo moderado.
    ✔️ Benefícios:
    Acompanhamento detalhado por categoria.
    Leitura mais objetiva da meta e do realizado.
    Maior clareza para tomada de decisão diária.

---

12. Adoção do Fluxo de Dia sem Registro na Tela por Categoria
    Implementamos o mesmo padrão de alerta de dia sem registro com opções de ação.
    🔹 Adicionamos ícone de exclamação para dias sem gasto e sem confirmação.
    🔹 Incluímos opção de registrar gasto ou marcar zero na planilha.
    🔹 Reutilizamos modal de confirmação para manter consistência visual.
    ✔️ Benefícios:
    Comportamento uniforme entre telas.
    Ação rápida para corrigir lacunas de registro.
    Melhor continuidade da rotina diária do cliente.

---

13. Separação de Zeros sem Pontuação no Ranking
    Criamos uma trilha de dados para registrar zeros que não devem gerar pontuação no ranking.
    🔹 Introduzimos novo campo de dias confirmados sem impacto no ranking.
    🔹 Implementamos método específico de confirmação de zero sem pontuação.
    🔹 Ajustamos persistência e conversão para suportar o novo atributo.
    ✔️ Benefícios:
    Regra de negócio atendida com precisão.
    Maior justiça na classificação do ranking.
    Rastreabilidade entre zeros comuns e zeros sem pontuação.

---

14. Ajuste do Serviço de Ranking para Ignorar Zeros sem Pontuação
    Atualizamos o cálculo do ranking para desconsiderar os dias marcados como sem impacto.
    🔹 Aplicamos subtração lógica entre conjunto de zeros totais e conjunto sem ranking.
    🔹 Mantivemos o filtro de participação por preferência do usuário.
    🔹 Preservamos retorno e ordenação existentes.
    ✔️ Benefícios:
    Pontuação alinhada à política definida.
    Ranking mais confiável para os participantes.
    Menor chance de distorção de resultado.

---

15. Melhoria no Retorno de Navegação após Cadastro de Gasto
    Refinamos a navegação da tela de cadastro para voltar ao contexto correto com parâmetros.
    🔹 Criamos retorno parametrizado para manter categoria ao fechar o modal de sucesso.
    🔹 Reaproveitamos o mesmo caminho em cancelamento e fechamento.
    🔹 Evitamos perda de contexto ao registrar gasto vindo da tela de categoria.
    ✔️ Benefícios:
    Fluxo de ida e volta mais natural.
    Menos cliques para retornar ao ponto de origem.
    Experiência mais coerente no uso diário.

---

17. Simplificação do Modal de Cadastrar Gasto no Planejamento do Consultor
    Removemos o seletor de forma de pagamento no modal de gasto, pois o valor já é dividido por cartão e dinheiro/pix.
    🔹 Excluímos o bloco de seleção entre cartão e dinheiro/pix.
    🔹 Mantivemos os dois campos de valor separados como fonte de verdade.
    🔹 Limpamos estados e referências que ficaram sem uso.
    ✔️ Benefícios:
    Formulário mais direto e sem redundância.
    Menos risco de inconsistência entre seleção e valores.
    Entrada de dados mais rápida para o consultor.

---

18. Correção da Home: Ordem dos Cards e Cálculo de Gasto Esperado
    Ajustamos a Home para exibir renda à esquerda e gastos à direita, além de corrigir a soma de gasto esperado.
    🔹 Invertimos a ordem dos cards esperados e também dos cards realizados para manter coerência visual.
    🔹 Atualizamos a lógica para excluir parcela de cartão no cálculo de gasto esperado.
    🔹 Consideramos amountCash quando houver divisão entre cartão e dinheiro/pix.
    ✔️ Benefícios:
    Leitura visual mais alinhada ao padrão solicitado.
    Valor de gasto esperado aderente ao planejamento.
    Maior confiança nos números exibidos na tela inicial.
