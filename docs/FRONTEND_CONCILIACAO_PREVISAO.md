# Handoff implementado — Conciliação + Previsão (frontend)

## Pantalla 1 — Conciliação OFX

**Archivo:** `src/components/modal/BankStatementImportModal.tsx`

- Columna **Prev.** (checkbox) en débitos — default ON desde `suggestedIsExpectedExpense`.
- Confirm envía `isExpectedExpense` + `expectedExpense` (desde `suggestedExpectedExpense` del preview).
- Toast post-confirm: `N gasto(s) registrado(s) · X memória(s) actualizada(s) · Y memória(s) nova(s)`.

**Parser:** `src/utils/ofxPreviewDrafts.ts` — campos nuevos en `DraftLine`.

## Pantalla 2 y 3 — Previsão

**Ruta:** `/previsao` — `src/pages/Previsao.tsx`

Pestañas:
1. **Previsão do mês** — `GET /api/v1/forecast/{targetMonth}?reconciliationMonth=`
2. **Memória de gastos esperados** — `GET /api/v1/expected-expenses?year=&activeOnly=true`

Badge: «Projeção — não contabiliza» cuando `isProjectionOnly: true`.

## API client

- `src/utils/forecastApi.ts`
- `src/types/expectedExpenseApi.ts`
- `src/types/forecastApi.ts`

## Menú

Sidebar: **Previsão** → `/previsao`

## Tests MSW

- `src/tests/mocks/forecastHandlers.ts`

## Flujo mensual UX

1. Conciliar OFX (Contas / Boletos → modal)
2. Ver memoria / previsão en `/previsao`
3. Gerar boletos (sin cambio de contrato)
