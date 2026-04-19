import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
      await screen.findByText(/Nenhum ingresso registrado ainda/i)
    ).toBeInTheDocument();
  });
});
