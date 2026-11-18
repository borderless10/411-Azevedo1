# Checklist de aceitação — desktop redesign (Fase 1)

## Automático
- [x] `npm test` — 74/74 pass
- [x] `npx tsc --noEmit` — sem erros novos nas áreas tocadas (DesktopShell, DesktopGlowCard, HomeDesktopDashboard, DesktopPage, Home desktop branch). Baseline pré-existente permanece em outros arquivos.
- [x] Path desktop da Home **não** monta `CardWaveBg` (`HomeDesktopDashboard` + gate `if (desktop)` em `HomeScreen`)
- [x] Path mobile da Home mantém FlatList + `CardWaveBg`

## Estrutural (código)
- [x] `Layout` desktop → `DesktopShell` (scroll full-bleed na coluna principal)
- [x] Tokens em `src/theme/desktopTokens.ts`
- [x] `DesktopGlowCard` sem PNG
- [x] Listas/forms cliente (Expense/Income/Tracked/Bills/Cards/Budget/Planning/CategoryBudget/Add-Edit/Settings/Profile) com `DesktopPageCanvas` (no-op no mobile)

## Visual / browser (capturas em `testes/desktop-captures/`)
- [x] Web ≥1024: Home desktop com sidebar + KPIs glow + tabela/ações (ex.: `home-auth-1440.png`)
- [x] Sem overflow horizontal em 1280 / 1366 / 1440 / 1920 (`scrollWidth === clientWidth`)
- [x] Smoke mobile Home 390 (`mobile-home-390.png`) — composição mobile intacta
- [x] Capturas nas resoluções de referência (`home-auth-*.png`)

## Fora de escopo (Fases 2–3)
Chat, Ranking, Feed, Metas/Wishlist/Shopping/Notes, Consultation, Consultor, Admin — mesmo shell/tokens depois.
