# Billing Policy — especificación backend

Documento de contrato para implementar en el backend (Symfony / EventStore) el **log de parámetros mensuales de boletos** que hoy el frontend resuelve en Boletos.

Referencia de implementación en frontend:

- Resolución pura: `src/utils/billingPolicyResolve.ts`
- Cliente HTTP: `src/utils/billingPolicyApi.ts`
- Tests MSW: `src/tests/mocks/billingPolicyHandlers.ts`

---

## Problema

Los parámetros de facturación (taxa extra, fundo, rateio síndico, preço do gás) **dependen del mes de boletos** (`targetMonth`), no son configuración global. Hoy:

- El frontend guardaba snapshots por mes en `localStorage`.
- `POST /slips/generation` recibe `extraFee` y `reserveFund` en el body (el cliente manda lo que quiere).
- `GET /gas/price` devuelve un único precio global sin histórico.
- `POST /setup/opening-reference-month` es un bootstrap único, no un log vivo.

**Objetivo:** fuente de verdad en servidor, resolución por `targetMonth`, trazabilidad tipo event store.

---

## Bounded context propuesto: `BillingPolicy`

Agregado: **`CondominiumBillingPolicy`** (un stream por condominio).

### Evento de dominio (append-only)

```text
MonthlyBillingParametersRecorded
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `target_month` | `YYYY-MM` | Mes al que aplican estos parámetros |
| `extra_fee_per_unit_cents` | int ≥ 0 | Taxa extra por unidad |
| `reserve_fund_per_unit_cents` | int ≥ 0 | Fundo de reserva por unidad |
| `syndic_share_total_cents` | int ≥ 0 | Total mensual rateio síndico |
| `syndic_allocation_rule` | `equal_parts` \| `ideal_fraction` | Regla de reparto |
| `gas_price_per_m3_cents` | int \| null | Preço gás para ese mes |
| `recorded_at` | ISO-8601 | Timestamp del evento |
| `recorded_by_user_id` | UUID | Usuario que guardó |

Cada `PUT` de mes **append** un evento (no sobrescribir silenciosamente el stream; la proyección materializada sí puede upsert por `target_month`).

### Proyección materializada (lectura rápida)

Tabla o documento: **`billing_policy_month_snapshots`**

- PK: `target_month`
- Último evento ganador por mes (por `recorded_at` o versión).

### Algoritmo `resolve(targetMonth)` — obligatorio en servidor

Idéntico al frontend (`billingPolicyResolve.ts`):

1. Si existe snapshot explícito para `targetMonth` → devolverlo (`explicit: true`, `sourceMonth = targetMonth`).
2. Si no → buscar el mayor `source_month` tal que `source_month < targetMonth` → heredar (`explicit: false`).
3. Si no hay ninguno → valores vacíos / defaults (`syndic_share_total_cents: 60000`, `equal_parts`, resto `0`, gas `null`).

```php
// Pseudocódigo
function resolve(string $targetMonth): ResolvedBillingPolicy
{
    if ($snapshot = $this->snapshots->find($targetMonth)) {
        return ResolvedBillingPolicy::explicit($targetMonth, $snapshot);
    }
    $prior = $this->snapshots->findLatestBefore($targetMonth);
    if ($prior === null) {
        return ResolvedBillingPolicy::empty($targetMonth);
    }
    return ResolvedBillingPolicy::inherited($targetMonth, $prior);
}
```

---

## Endpoints HTTP

Base: `/api/v1/billing-policy`  
Auth: JWT (igual que el resto).  
JSON: aceptar **camelCase y snake_case** (convención existente del proyecto).

### `PUT /api/v1/billing-policy/months/{targetMonth}`

Registra parámetros para un mes (emite `MonthlyBillingParametersRecorded`).

**Body:**

```json
{
  "extra_fee_per_unit_cents": 25000,
  "reserve_fund_per_unit_cents": 9370,
  "syndic_share_total_cents": 60000,
  "syndic_allocation_rule": "equal_parts",
  "gas_price_per_m3_cents": 2600
}
```

**Responses:**

- `201 Created` — evento persistido.
- `400 Bad Request` — validación.

### `GET /api/v1/billing-policy/resolve?targetMonth=2026-04`

Devuelve parámetros **resueltos** para generación / UI.

**Response 200:**

```json
{
  "target_month": "2026-04",
  "source_month": "2026-01",
  "explicit": false,
  "extra_fee_per_unit_cents": 25000,
  "reserve_fund_per_unit_cents": 9370,
  "syndic_share_total_cents": 60000,
  "syndic_allocation_rule": "equal_parts",
  "gas_price_per_m3_cents": 2600,
  "recorded_at": "2026-01-10T12:00:00+00:00"
}
```

### `GET /api/v1/billing-policy/months/{targetMonth}` (opcional v1)

Solo snapshot **explícito**. `404` si no hay entrada para ese mes (aunque `resolve` heredaría).

### `GET /api/v1/billing-policy/events?limit=50` (opcional v1)

Auditoría: lista cronológica de eventos append-only.

---

## Integración con Slip generation

### Cambio en `POST /api/v1/slips/generation`

**Antes (transitorio):** body incluye `extraFee`, `reserveFund` mandados por el cliente.

**Objetivo:**

```json
{
  "targetMonth": "2026-04",
  "force": false
}
```

El handler:

```text
$policy = $billingPolicy->resolve($targetMonth);
// usar extra_fee_per_unit_cents, reserve_fund_per_unit_cents, syndic_*, gas_price_*
```

**Regla de transición:** si existen snapshots en BillingPolicy, **ignorar** `extraFee`/`reserveFund` del body aunque el cliente los envíe (compatibilidad con front antiguo). Log warning si difieren.

Igual para `GET /api/v1/slips/generation/explain?targetMonth=...`.

---

## Integración con Gas

Opciones (elegir una):

1. **Recomendada:** `gas_price_per_m3_cents` vive en BillingPolicy; generación de boletos usa `resolve().gas_price_per_m3_cents` para el mes. El contexto Gas sigue gestionando lecturas; el precio aplicado al boleto sale de BillingPolicy.
2. **Alternativa:** cada `MonthlyBillingParametersRecorded` con gas dispara también `GasPricePerM3Set` en el stream de Gas con `effective_from_ym`.

Evitar depender de `GET /gas/price` global cuando se genera un mes histórico.

---

## Bootstrap desde setup

Al completar `POST /setup/opening-reference-month`, el backend debería emitir automáticamente:

```text
MonthlyBillingParametersRecorded(
  target_month = referenceMonth,
  extra_fee_per_unit_cents = ...,
  reserve_fund_per_unit_cents = ...,
  syndic_share_total_cents = expectedSyndicShareTotalCents ?? 60000,
  syndic_allocation_rule = ...,
  gas_price_per_m3_cents = optionalGasTotalCents / consumo ?? null
)
```

Así el primer mes ya tiene snapshot sin depender del frontend.

---

## Implementación Symfony (orientación)

Alineado con Account (`CreateAccountCommandHandler`, EventStore, `InitialBalanceSet`):

| Pieza | Sugerencia |
|-------|------------|
| Comando | `RecordMonthlyBillingParametersCommand` |
| Handler | Valida → append evento → actualiza proyección |
| Query | `ResolveBillingPolicyQuery` / `ResolveBillingPolicyQueryHandler` |
| Controller | `PutBillingPolicyMonthController`, `ResolveBillingPolicyGetController` |
| Tests | Unit del algoritmo resolve; integration PUT + GET; generation usa resolve |

---

## Frontend (estado actual)

- Boletos llama `GET /billing-policy/resolve` al cambiar mes y `PUT .../months/{ym}` con debounce al editar.
- Cache local (`condominium.convention.byMonth`) como offline / fallback si el endpoint devuelve 404/501.
- Aviso en UI cuando solo hay cache local.

Cuando el backend despliegue estos endpoints, el frontend sincronizará sin cambios de UX adicionales.

---

## Checklist de aceptación backend

- [ ] `PUT months/2026-01` persiste y `resolve?targetMonth=2026-01` devuelve `explicit: true`
- [ ] `resolve?targetMonth=2026-03` hereda de enero si febrero no existe
- [ ] `POST slips/generation` usa resolve, no body del cliente
- [ ] Bootstrap desde `opening-reference-month` crea primer snapshot
- [ ] Eventos append-only consultables (auditoría)
- [ ] Tests de regresión con mismos casos que `billingPolicyResolve.test.ts`
