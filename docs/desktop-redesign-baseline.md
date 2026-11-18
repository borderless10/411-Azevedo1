# Baseline — feat/desktop-redesign

## Branch
`feat/desktop-redesign` from `main` (nov/2026).

## Rotas (ScreenName)
Login, Register, Home, AddIncome, EditIncome, IncomeList, TrackedIncome, AddExpense, EditExpense, ExpenseList, Dashboard, Profile, PublicGamificationProfile, Settings, ConsumoModerado, Feed, Chat, Metas, Wishlist, Investments, Recomendacao, Ranking, BadgeHolders, BadgeManagement, ClientPlanning, ClientInvestments, ClientInvestmentsView, ClientDetail, ClientExpenseRecords, ClientIncomeRecords, ClientList, ConsultorHome, PlanningView, Budget, CategoryBudget, Bills, CadastrarCliente, AdminUsers, EditUser, Cartoes, ConsultationScheduling, ClientInstallments, UserNotes, ShoppingList.

## PNG decorativos (CardWaveBg)
Usados **somente no path mobile** da Home: v2Purple/Magenta/Square/Wide, action*, tx*.
Desktop Home usa `DesktopGlowCard` (sem PNG). Órfãos: wave-*, card-income/expense, glows/*.

## Bug scroll (corrigido)
Antes: Layout desktop centrava `maxWidth` e o FlatList da Home rolava **dentro** da coluna.
Agora: `DesktopShell` — única área de scroll na coluna principal, full-bleed até a borda direita.

## Mobile
Preservar composição atual; desktop = composição própria via `useDesktopWeb()`.

## Aceitação
Ver `docs/desktop-redesign-acceptance.md`.
