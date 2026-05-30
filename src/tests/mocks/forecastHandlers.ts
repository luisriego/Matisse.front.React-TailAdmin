import { http, HttpResponse } from "msw";

const sampleExpectedExpenses = () => [
  {
    id: "exp-mem-1",
    displayName: "Copasa",
    expenseTypeId: "type-1",
    expenseTypeCode: "SP2AG",
    frequency: "monthly",
    monthsOfYear: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    amountKind: "variable",
    lastAmountCents: 18074,
    dueDay: 10,
    isActive: true,
    lastReconciledMonth: "2026-01",
  },
];

export const forecastHandlers = [
  http.get("/api/v1/expected-expenses", () =>
    HttpResponse.json({ data: sampleExpectedExpenses() }),
  ),

  http.get("/api/v1/forecast/:targetMonth", ({ params, request }) => {
    const targetMonth = String(params.targetMonth ?? "2026-02");
    const url = new URL(request.url);
    const reconciliationMonth =
      url.searchParams.get("reconciliationMonth") ??
      url.searchParams.get("reconciliation_month") ??
      "2026-01";

    return HttpResponse.json({
      data: {
        targetMonth,
        reconciliationMonth,
        documentKind: "previsao",
        isProjectionOnly: true,
        dueDate: `${targetMonth}-10`,
        billingPolicy: {
          targetMonth,
          sourceMonth: reconciliationMonth,
          explicit: false,
          extraFeePerUnitCents: 25000,
          reserveFundPerUnitCents: 9370,
          syndicShareTotalCents: 60000,
          syndicAllocationRule: "equal_parts",
          gasPricePerM3Cents: 2600,
          recordedAt: "2026-01-10T12:00:00+00:00",
        },
        units: [
          { unit: "101", totalCents: 49610, gasCents: 3240 },
          { unit: "201", totalCents: 48800, gasCents: 2800 },
        ],
        gas: {
          consumptionCalendarMonth: reconciliationMonth,
          totalCents: 45000,
        },
        expectedExpenseLines: [{ displayName: "Copasa", amountCents: 18074 }],
        totals: { boletoGrandTotalCents: 259242 },
      },
    });
  }),
];
