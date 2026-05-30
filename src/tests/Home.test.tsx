import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "./mocks/server";

vi.mock("../components/dashboard/RevenueExpenseChart", () => ({
  default: () => <div>Despesas vs Ingressos (mock)</div>,
}));

vi.mock("../components/dashboard/GasConsumptionChart", () => ({
  default: () => <div>Consumo de gás por unidade (mock)</div>,
}));

import Home from "../pages/Dashboard/Home";

function renderHome() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("Home dashboard", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("token", "mock-token");

    server.use(
      http.get("/api/v1/accounts", () => HttpResponse.json({ accounts: [] })),
      http.get(/\/api\/v1\/expenses\/date-range\/\d+\/\d+/, () => HttpResponse.json([])),
      http.get("/api/v1/incomes", () => HttpResponse.json([])),
      http.get(/\/api\/v1\/recurring-expenses\/pending-monthly\/\d+\/\d+/, () =>
        HttpResponse.json([]),
      ),
      http.get("/api/v1/resident-unit/actives", () => HttpResponse.json([])),
      http.get("/api/v1/slips", () => HttpResponse.json({ slips: [] })),
    );
  });

  it("renderiza seções operacionais do painel", async () => {
    renderHome();

    expect(await screen.findByText(/Saldo total/i)).toBeInTheDocument();
    expect(screen.getByText(/Despesas vs Ingressos/i)).toBeInTheDocument();
    expect(screen.getByText(/Consumo de gás por unidade/i)).toBeInTheDocument();
    expect(screen.getByText(/Boletos vencidos/i)).toBeInTheDocument();
    expect(screen.getByText(/Despesas recorrentes pendentes/i)).toBeInTheDocument();
    expect(screen.getByText(/Saldos por conta/i)).toBeInTheDocument();
  });

  it("mostra estado vazio de recurrentes quando API não tem pendentes", async () => {
    renderHome();

    await waitFor(() => {
      expect(
        screen.getByText(/Nenhuma despesa recorrente pendente neste mês/i),
      ).toBeInTheDocument();
    });
  });
});
