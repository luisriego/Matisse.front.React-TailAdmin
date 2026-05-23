import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "./mocks/server";
import Incomes from "../pages/Incomes";

function renderIncomes() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <Incomes />
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe("Incomes", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("muestra error de carga cuando falta el token", async () => {
    renderIncomes();

    expect(
      await screen.findByText(/Falha ao carregar os ingressos/i)
    ).toBeInTheDocument();
  });

  it("muestra estado vacío cuando la API devuelve lista vacía", async () => {
    localStorage.setItem("token", "mock-token");

    server.use(
      http.get("/api/v1/resident-unit/actives", () => HttpResponse.json([])),
      http.get("/api/v1/income-types", () => HttpResponse.json([])),
      http.get("/api/v1/incomes", () => HttpResponse.json([]))
    );

    renderIncomes();

    expect(
      await screen.findByText(/Nenhum ingresso registrado no período selecionado/i)
    ).toBeInTheDocument();
  });

  it("normaliza envelope { data } e snake_case; filtra por mês de due_date", async () => {
    localStorage.setItem("token", "mock-token");
    const typeId = "146b4777-5eb6-4d3d-bed7-000000000001";
    server.use(
      http.get("/api/v1/resident-unit/actives", () => HttpResponse.json([])),
      http.get("/api/v1/income-types", () =>
        HttpResponse.json({
          data: [{ id: typeId, name: "Condomínio", code: "C", description: "" }],
        }),
      ),
      http.get("/api/v1/incomes", () =>
        HttpResponse.json({
          data: [
            {
              id: "2c29da0c-aaaa-bbbb-cccc-111111111111",
              resident_unit_id: null,
              amount: 596766,
              due_date: "2026-01-08 00:00:00",
              paid_at: "2026-01-08 00:00:00",
              type_id: typeId,
              description: "Cobrança teste",
            },
          ],
        }),
      ),
    );

    const user = userEvent.setup();
    renderIncomes();

    await waitFor(() => {
      expect(screen.queryByText(/Carregando ingressos/i)).not.toBeInTheDocument();
    });

    expect(
      await screen.findByText(/ingresso\(s\) noutros períodos/i),
    ).toBeInTheDocument();

    const select = screen.getByLabelText(/Mês\/Ano/i);
    await user.selectOptions(select, "2026-01");

    expect(await screen.findByText("Condomínio")).toBeInTheDocument();
    expect(screen.getByText("Cobrança teste")).toBeInTheDocument();
  });

  it("agrupa linhas de rendimento repetidas e expande com +", async () => {
    localStorage.setItem("token", "mock-token");
    const tipoRend = "type-rend";
    const tipoTaxa = "type-taxa";
    server.use(
      http.get("/api/v1/resident-unit/actives", () => HttpResponse.json([])),
      http.get("/api/v1/income-types", () =>
        HttpResponse.json({
          data: [
            { id: tipoRend, name: "Rendimentos Financeiros", code: "", description: "" },
            { id: tipoTaxa, name: "Taxa Condominial", code: "", description: "" },
          ],
        }),
      ),
      http.get("/api/v1/incomes", () =>
        HttpResponse.json({
          data: [
            {
              id: "r1",
              amount: 62,
              due_date: "2026-01-02",
              type_id: tipoRend,
              description: "RENDIMENTOS REND PAGO APLIC AUT MAIS",
            },
            {
              id: "t1",
              amount: 596766,
              due_date: "2026-01-08",
              type_id: tipoTaxa,
              description: "Compensação de boletos – 12/2025",
            },
            {
              id: "r2",
              amount: 88,
              due_date: "2026-01-12",
              type_id: tipoRend,
              description: "RENDIMENTOS REND PAGO APLIC AUT MAIS",
            },
          ],
        }),
      ),
    );

    const user = userEvent.setup();
    renderIncomes();
    await waitFor(() => {
      expect(screen.queryByText(/Carregando ingressos/i)).not.toBeInTheDocument();
    });

    const select = screen.getByLabelText(/Mês\/Ano/i);
    await user.selectOptions(select, "2026-01");

    expect(await screen.findByText("Rendimentos Financeiros")).toBeInTheDocument();
    expect(screen.getByText(/\(\s*2\s+lançamentos\s*\)/)).toBeInTheDocument();
    expect(
      screen.getByText("RENDIMENTOS REND PAGO APLIC AUT MAIS", {
        selector: "span.leading-snug",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Compensação de boletos/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Ver cada lançamento de rendimento/i }),
    );
    const memos = screen.getAllByText("RENDIMENTOS REND PAGO APLIC AUT MAIS");
    expect(memos.length).toBeGreaterThanOrEqual(2);
  });

  it("mantém Mês/Ano ao sair e voltar (localStorage)", async () => {
    localStorage.setItem("token", "mock-token");

    server.use(
      http.get("/api/v1/resident-unit/actives", () => HttpResponse.json([])),
      http.get("/api/v1/income-types", () => HttpResponse.json([])),
      http.get("/api/v1/incomes", () => HttpResponse.json([])),
    );

    const user = userEvent.setup();
    const view = render(
      <HelmetProvider>
        <MemoryRouter>
          <Incomes />
        </MemoryRouter>
      </HelmetProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText(/Carregando ingressos/i)).not.toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText(/Mês\/Ano/i), "2026-01");
    expect(localStorage.getItem("ingressos.selectedPeriodYm")).toBe("2026-01");

    view.unmount();

    render(
      <HelmetProvider>
        <MemoryRouter>
          <Incomes />
        </MemoryRouter>
      </HelmetProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText(/Carregando ingressos/i)).not.toBeInTheDocument();
    });

    expect((screen.getByLabelText(/Mês\/Ano/i) as HTMLSelectElement).value).toBe(
      "2026-01",
    );
    expect(screen.getByText(/Ingressos de janeiro de 2026/i)).toBeInTheDocument();
  });
});
