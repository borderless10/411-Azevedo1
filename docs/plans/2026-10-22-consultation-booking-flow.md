# Fluxo de agendamento de consultoria

## Objetivo

Garantir que o cliente abra o link uma única vez por ciclo, confirme o dia uma
única vez e dependa da equipe Visão para qualquer alteração posterior.

## Máquina de estados

- `available`: há link, ciclo atual identificado, link ainda não aberto e sem
  confirmação no ciclo.
- `awaitingConfirmation`: link aberto no ciclo atual e dia ainda não
  confirmado.
- `booked`: dia confirmado no ciclo atual.

Sem `cycleStartKey`, a abertura fica desabilitada. Sem link, permanece o fluxo
de solicitação de liberação, exceto quando já existe confirmação no ciclo.

## Persistência e concorrência

- `consultationSchedulingOpenedCycleStartedAt`: chave do ciclo em que o link
  foi aberto.
- `consultationSchedulingOpenedAt`: timestamp de auditoria da abertura.
- A abertura usa transação e persiste antes de chamar o link externo.
- A confirmação usa transação, exige abertura no ciclo e rejeita uma segunda
  confirmação.
- O listener atual de `users/{uid}` reflete abertura, confirmação e liberação
  em tempo real.

## Interface

- Disponível: botão `Abrir agendamento`.
- Aguardando: CTA pulsante `Sua consultoria já foi agendada? Clique aqui!`;
  o calendário só aparece após esse toque.
- Agendada: dia travado, sem calendário e orientação para contatar a equipe
  Visão.
- Sidebar: disponível, aguardando confirmação ou agendada, sem antecipar o
  status de agendada.

## Reabertura administrativa

`releaseConsultationBooking` limpa abertura e confirmação, preserva os campos
de confirmação anterior e mantém link e melhor dia configurados.

## Verificação

1. Testar as transições e a liberação com testes unitários.
2. Executar a suíte completa.
3. Executar TypeScript focado nos arquivos alterados e separar erros
   preexistentes dos erros introduzidos.
