import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddAccountModal from "../components/modal/AddAccountModal";

describe("AddAccountModal", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.setItem("token", "mock-token");
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
    localStorage.clear();
  });

  it("PUT create não envia campo code e inclui saldo inicial", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/v1/accounts/create")) {
        const body = JSON.parse(String(init?.body ?? "{}"));
        expect(body).not.toHaveProperty("code");
        expect(body.name).toBe("Conta Corrente");
        expect(body.initial_balance_amount).toBe(510219);
        expect(body.initial_balance_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        return new Response(JSON.stringify({ id: "uuid-resposta-api" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("{}", { status: 500 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const onAdded = vi.fn();
    const onClose = vi.fn();

    render(
      <AddAccountModal isOpen={true} onClose={onClose} onAccountAdded={onAdded} />,
    );

    fireEvent.change(screen.getByLabelText(/Nome/i), {
      target: { value: "Conta Corrente" },
    });
    fireEvent.change(screen.getByLabelText(/Saldo inicial/i), {
      target: { value: "5102.19" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Salvar Conta/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(onAdded).toHaveBeenCalled();
  });

  it("com descrição, PATCH só envia name e description (sem code)", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/v1/accounts/create")) {
        return new Response(JSON.stringify({ id: "nova-conta-id" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/api/v1/accounts/nova-conta-id")) {
        expect(init?.method).toBe("PATCH");
        const body = JSON.parse(String(init?.body ?? "{}"));
        expect(body).toEqual({
          name: "Reserva",
          description: "Fundo legal",
        });
        return new Response(null, { status: 204 });
      }
      return new Response("{}", { status: 500 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    render(
      <AddAccountModal
        isOpen={true}
        onClose={() => {}}
        onAccountAdded={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Nome/i), {
      target: { value: "Reserva" },
    });
    fireEvent.change(screen.getByLabelText(/Descrição/i), {
      target: { value: "Fundo legal" },
    });
    fireEvent.change(screen.getByLabelText(/Saldo inicial/i), {
      target: { value: "0" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Salvar Conta/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
