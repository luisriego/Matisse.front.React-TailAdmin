import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "./mocks/server";
import { useDashboardData } from "../hooks/useDashboardData";

function stubDashboardHandlers() {
  server.use(
    http.get("/api/v1/accounts", () =>
      HttpResponse.json({
        accounts: [{ id: "acc-1", name: "Conta Gás", isActive: true, balance: 0 }],
      }),
    ),
    http.get("/api/v1/accounts/acc-1/balance", () =>
      HttpResponse.json({ balance: 200000 }),
    ),
    http.get(/\/api\/v1\/expenses\/date-range\/\d+\/\d+/, () => HttpResponse.json([])),
    http.get("/api/v1/incomes", () => HttpResponse.json([])),
    http.get(/\/api\/v1\/recurring-expenses\/pending-monthly\/\d+\/\d+/, () =>
      HttpResponse.json([
        {
          id: "rec-1",
          description: "Conservadora",
          amount: 140284,
          dueDay: 10,
          type: "Serviço",
        },
      ]),
    ),
    http.get("/api/v1/resident-unit/actives", () =>
      HttpResponse.json([{ id: "u101", unit: "101" }]),
    ),
    http.get("/api/v1/slips", () =>
      HttpResponse.json({
        slips: [
          {
            id: "slip-1",
            residentUnitId: "u101",
            amount: 113327,
            dueDate: "2020-01-01",
            paidAt: null,
          },
        ],
      }),
    ),
    http.get("/api/v1/slips/slip-1", () =>
      HttpResponse.json({
        id: "slip-1",
        residentUnitId: "u101",
        amount: 113327,
        dueDate: "2020-01-01",
        paidAt: null,
      }),
    ),
    http.get("/api/v1/gas/price", () =>
      HttpResponse.json({ price_per_m3_in_cents: 2600 }),
    ),
    http.get(/\/api\/v1\/gas\/resident-units\/.*\/reading\/\d+\/\d+/, () =>
      HttpResponse.json({ reading: 100 }),
    ),
  );
}

describe("useDashboardData", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("token", "mock-token");
  });

  it("agrega contas, recurrentes e boletos da API", async () => {
    stubDashboardHandlers();

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].balance).toBe(200000);
    expect(result.current.recurring).toHaveLength(1);
    expect(result.current.recurring[0].description).toBe("Conservadora");
    expect(result.current.slips).toHaveLength(1);
    expect(result.current.slips[0].unitLabel).toBe("101");
    expect(result.current.error).toBeNull();
  });

  it("reporta erro sem token", async () => {
    localStorage.removeItem("token");

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toMatch(/autenticação/i);
  });
});
