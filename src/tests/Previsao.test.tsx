import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import Previsao from "../pages/Previsao";

function renderPrevisao() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <Previsao />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("Previsao page", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("token", "mock-token");
    localStorage.setItem("bank.lastImportedStatementPeriod", "2026-01");
  });

  it("mostra badge de projeção e totais do forecast", async () => {
    renderPrevisao();

    await waitFor(() => {
      expect(screen.getByText(/Projeção — não contabiliza/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Total boletos \(projectado\)/i)).toBeInTheDocument();
  });

  it("lista memória de gastos esperados", async () => {
    renderPrevisao();

    const memoriaTab = screen.getByRole("button", { name: /Memória de gastos esperados/i });
    memoriaTab.click();

    await waitFor(() => {
      expect(screen.getByText("Copasa")).toBeInTheDocument();
    });
  });
});
