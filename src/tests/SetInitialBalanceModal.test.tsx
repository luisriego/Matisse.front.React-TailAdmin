import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SetInitialBalanceModal from "../components/modal/SetInitialBalanceModal";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("SetInitialBalanceModal", () => {
  const originalFetch = globalThis.fetch;
  const account = {
    id: "acc-1",
    name: "Conta Principal",
    description: null,
    isActive: true,
    balance: 0,
  };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("token", "mock-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
    localStorage.clear();
  });

  it("obliga flujo preview -> confirm con checkbox de confirmación", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/v1/initial-setup/preview")) {
        return jsonResponse(200, {
          previewId: "preview-123",
          bankBalanceInCents: 100000,
          accountsInputTotalInCents: 99000,
          discrepancyInCents: 1000,
          absorptionOrder: ["principal", "taxa extra", "fundo reserva"],
          absorbedBreakdown: [{ accountName: "Conta Principal", absorbedInCents: 1000 }],
          finalBalances: [{ accountName: "Conta Principal", finalBalanceInCents: 100000 }],
        });
      }
      if (url.endsWith("/api/v1/initial-setup/confirm")) {
        const body = JSON.parse(String(init?.body ?? "{}"));
        expect(body).toEqual({ accountId: "acc-1", previewId: "preview-123" });
        return jsonResponse(200, {
          adjustedAmountInCents: 1000,
          adjustedAccountName: "Conta Principal",
        });
      }
      return jsonResponse(404, { message: "not found" });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const onInitialBalanceSet = vi.fn();
    render(
      <SetInitialBalanceModal
        isOpen={true}
        onClose={() => {}}
        account={account}
        onInitialBalanceSet={onInitialBalanceSet}
      />
    );

    fireEvent.change(screen.getByRole("spinbutton", { name: /Valor/i }), {
      target: { value: "1000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Gerar Preview/i }));

    expect(await screen.findByText(/Preview do ajuste/i)).toBeInTheDocument();
    const confirmButton = screen.getByRole("button", { name: /Confirmar ajuste/i });
    expect(confirmButton).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(confirmButton).not.toBeDisabled());
    fireEvent.click(confirmButton);

    expect(await screen.findByText(/Se ajustó/i)).toBeInTheDocument();
    expect(onInitialBalanceSet).toHaveBeenCalledTimes(1);
  });

  it("invalida preview al editar valores y obliga recalcular", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/v1/initial-setup/preview")) {
        return jsonResponse(200, {
          previewId: "preview-abc",
          bankBalanceInCents: 50000,
          accountsInputTotalInCents: 49000,
          discrepancyInCents: 1000,
          absorbedBreakdown: [],
          finalBalances: [],
        });
      }
      if (url.endsWith("/api/v1/initial-setup/confirm")) {
        return jsonResponse(200, {
          adjustedAmountInCents: 1000,
          adjustedAccountName: "Conta Principal",
        });
      }
      return jsonResponse(404, { message: "not found" });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    render(
      <SetInitialBalanceModal
        isOpen={true}
        onClose={() => {}}
        account={account}
        onInitialBalanceSet={() => {}}
      />
    );

    fireEvent.change(screen.getByRole("spinbutton", { name: /Valor/i }), {
      target: { value: "500" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Gerar Preview/i }));
    expect(await screen.findByText(/Preview do ajuste/i)).toBeInTheDocument();

    fireEvent.change(screen.getByRole("spinbutton", { name: /Valor/i }), {
      target: { value: "600" },
    });
    await waitFor(() =>
      expect(screen.queryByText(/Preview do ajuste/i)).not.toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /Confirmar ajuste/i })).toBeDisabled();
  });
});
