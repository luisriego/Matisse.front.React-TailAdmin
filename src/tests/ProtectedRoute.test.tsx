import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { http, HttpResponse } from "msw";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { server } from "./mocks/server";
import { jwtFromPayload } from "./mocks/mockJwt";
import { clearSetupUnitBypass } from "../utils/jwtResidentialUnit";
import {
  LOCAL_BUSINESS_SETUP_COMPLETE_KEY,
  STORAGE_SETUP_REQUIRED_KEY,
} from "../utils/setupApi";

const validToken = jwtFromPayload({ exp: 4102444800, id: "u1", sub: "u1" });

function protectedTree() {
  return (
    <Route element={<ProtectedRoute />}>
      <Route index element={<div>Conteúdo protegido</div>} />
      <Route path="/contas" element={<div>Página de contas</div>} />
    </Route>
  );
}

const emptyCatalogHandlers = () => [
  http.get("/api/v1/setup/status", () =>
    HttpResponse.json({
      data: {
        complete: false,
        currentStep: 0,
        steps: {},
        message: "Finalize a configuração inicial.",
      },
    }),
  ),
  http.get("/api/v1/resident-unit/actives", () => HttpResponse.json([])),
  http.get("/api/v1/accounts", () => HttpResponse.json({ accounts: [] })),
  http.get("/api/v1/expense-types", () => HttpResponse.json([])),
  http.get("/api/v1/income-types", () => HttpResponse.json([])),
  http.get("/api/v1/gas/price", () => new HttpResponse(null, { status: 404 })),
];

const completeCatalogHandlers = () => [
  http.get("/api/v1/setup/status", () =>
    HttpResponse.json({
      data: {
        complete: true,
        currentStep: 0,
        steps: {
          initialBalances: true,
          gasPrice: true,
          gasReadings: true,
          initialExpenses: true,
          openingReferenceMonth: true,
        },
      },
    }),
  ),
  http.get("/api/v1/resident-unit/actives", () =>
    HttpResponse.json([{ id: "ru1", unit: "101", idealFraction: 0, isActive: true }]),
  ),
  http.get("/api/v1/accounts", () =>
    HttpResponse.json({
      accounts: [{ id: "a1", name: "Caixa", isActive: true }],
    }),
  ),
  http.get("/api/v1/expense-types", () => HttpResponse.json(["services"])),
  http.get("/api/v1/income-types", () =>
    HttpResponse.json([{ id: "t1", name: "Quota" }]),
  ),
  http.get("/api/v1/gas/price", () =>
    HttpResponse.json({ price_per_m3_in_cents: 2600 }),
  ),
];

describe("ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearSetupUnitBypass();
  });

  it("redirige a /signin cuando não há token", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          {protectedTree()}
          <Route path="/signin" element={<div>Página de login</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Página de login")).toBeInTheDocument();
  });

  it("permite entrada quando catálogos mínimos estão completos", async () => {
    localStorage.setItem("token", validToken);
    server.use(...completeCatalogHandlers());

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          {protectedTree()}
          <Route path="/signin" element={<div>Página de login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
    });
    expect(localStorage.getItem(LOCAL_BUSINESS_SETUP_COMPLETE_KEY)).toBe("1");
  });

  it("bloqueia com wizard quando faltam unidades e catálogos", async () => {
    localStorage.setItem("token", validToken);
    server.use(...emptyCatalogHandlers());

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          {protectedTree()}
          <Route path="/signin" element={<div>Página de login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Configuração inicial do condomínio"),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Passo 1 — Unidades residenciais/i),
    ).toBeInTheDocument();
  });

  it("mostra painel de gás quando catálogos OK mas setup core pendente", async () => {
    localStorage.setItem("token", validToken);
    server.use(
      http.get("/api/v1/setup/status", () =>
        HttpResponse.json({
          data: {
            complete: false,
            currentStep: 2,
            steps: {
              initialBalances: "complete",
              gasPrice: "pending",
              gasReadings: "pending",
            },
            message: "Falta configurar el precio del gas.",
          },
        }),
      ),
      http.get(/\/api\/v1\/gas\/resident-units\/.*\/reading\//, () =>
        new HttpResponse(null, { status: 404 }),
      ),
      ...completeCatalogHandlers().slice(1),
    );

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          {protectedTree()}
          <Route path="/signin" element={<div>Página de login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Preço e leituras iniciais de gás"),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Guardar e continuar")).toBeInTheDocument();
    });
  });

  it("liberta app quando API marca complete mesmo com envelope 403 antigo em sessionStorage", async () => {
    localStorage.setItem("token", validToken);
    sessionStorage.setItem(
      STORAGE_SETUP_REQUIRED_KEY,
      JSON.stringify({
        message: "Bloqueio antigo",
        setup: {
          complete: false,
          currentStep: 2,
          steps: { gasPrice: "pending", gasReadings: "pending" },
        },
        ts: Date.now(),
      }),
    );
    server.use(...completeCatalogHandlers());

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          {protectedTree()}
          <Route path="/signin" element={<div>Página de login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
    });
    expect(
      screen.queryByText("Preço e leituras iniciais de gás"),
    ).not.toBeInTheDocument();
  });

  it("não permite navegar a /contas enquanto setup incompleto", async () => {
    localStorage.setItem("token", validToken);
    server.use(...emptyCatalogHandlers());

    render(
      <MemoryRouter initialEntries={["/contas"]}>
        <Routes>
          {protectedTree()}
          <Route path="/signin" element={<div>Página de login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Configuração inicial do condomínio"),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Página de contas")).not.toBeInTheDocument();
  });
});
