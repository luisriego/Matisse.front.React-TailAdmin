import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BankStatementImportModal from "../components/modal/BankStatementImportModal";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("BankStatementImportModal", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("token", "mock-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
    localStorage.clear();
  });

  it("envía payload de crédito con lineType=income y passthrough de split fallback", async () => {
    const confirmBodies: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/v1/bank/ofx-ingest")) {
        return jsonResponse(200, {
          credits: [
            {
              fitId: "fit-cr-abril-1",
              bankAccountId: "bank-1",
              amountInCents: 162758,
              postedAt: "2026-04-06",
              memo: "LIQUIDACAO BOLETOS",
              suggestedCreditKind: "boleto_settlement",
              settlementMonth: "2026-03",
              settlementExtraFeePerUnitCents: 110,
              settlement_reserve_fund_per_unit_cents: 220,
            },
          ],
        });
      }
      if (url.endsWith("/api/v1/expense-types")) return jsonResponse(200, []);
      if (url.endsWith("/api/v1/income-types")) return jsonResponse(200, [{ id: "inc-1", name: "Juros" }]);
      if (url.endsWith("/api/v1/accounts")) return jsonResponse(200, []);
      if (url.endsWith("/api/v1/bank/ofx-matching-context")) return jsonResponse(200, {});
      if (url.endsWith("/api/v1/bank/ofx-confirm")) {
        confirmBodies.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
        return jsonResponse(201, {
          imported: 1,
          skipped: 0,
          settlementMonth: "2026-03",
          settlementValidatedAgainstSlips: true,
        });
      }
      return jsonResponse(404, { message: "not found" });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const { container } = render(<BankStatementImportModal isOpen={true} onClose={() => {}} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput!, {
      target: {
        files: [new File(["OFX"], "statement.ofx", { type: "application/x-ofx" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /Gerar pré-visualização/i }));

    expect(await screen.findByRole("button", { name: /Confirmar/i })).toBeInTheDocument();
    expect(screen.getByText(/Mês de cobro bancário:/i)).toBeInTheDocument();
    expect(screen.getByText(/Mês conciliado:/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Confirmar/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/bank/ofx-confirm",
        expect.objectContaining({ method: "POST" })
      )
    );

    expect(confirmBodies).toHaveLength(1);
    const lines = (confirmBodies[0]?.lines ?? []) as Array<Record<string, unknown>>;
    expect(confirmBodies[0]?.bankAccountId).toBe("bank-1");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual(
      expect.objectContaining({
        lineType: "income",
        creditKind: "boleto_settlement",
        fitId: "fit-cr-abril-1",
        postedAt: "2026-04-06",
        settlementExtraFeePerUnitCents: 110,
        settlementReserveFundPerUnitCents: 220,
      })
    );
  });

  it("exige incomeTypeId cuando crédito se clasifica como other", async () => {
    const confirmBodies: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/v1/bank/ofx-ingest")) {
        return jsonResponse(200, {
          credits: [
            {
              fitId: "fit-cr-other",
              bankAccountId: "bank-1",
              amountInCents: 900,
              postedAt: "2026-04-08",
              memo: "REEMBOLSO",
              suggestedCreditKind: "boleto_settlement",
            },
          ],
        });
      }
      if (url.endsWith("/api/v1/expense-types")) return jsonResponse(200, []);
      if (url.endsWith("/api/v1/income-types")) {
        return jsonResponse(200, [{ id: "inc-refund", name: "Reembolso" }]);
      }
      if (url.endsWith("/api/v1/accounts")) return jsonResponse(200, []);
      if (url.endsWith("/api/v1/bank/ofx-matching-context")) return jsonResponse(200, {});
      if (url.endsWith("/api/v1/bank/ofx-confirm")) {
        confirmBodies.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
        return jsonResponse(201, { imported: 1, skipped: 0 });
      }
      return jsonResponse(404, { message: "not found" });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const { container } = render(<BankStatementImportModal isOpen={true} onClose={() => {}} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput!, {
      target: {
        files: [new File(["OFX"], "statement.ofx", { type: "application/x-ofx" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /Gerar pré-visualização/i }));
    expect(await screen.findByRole("button", { name: /Confirmar/i })).toBeInTheDocument();

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0]!, { target: { value: "other" } });

    const confirmButton = screen.getByRole("button", { name: /Confirmar/i });
    await waitFor(() => expect(confirmButton).toBeDisabled());
    expect(confirmBodies).toHaveLength(0);

    fireEvent.change(selects[1]!, { target: { value: "inc-refund" } });
    await waitFor(() => expect(confirmButton).not.toBeDisabled());
    fireEvent.click(confirmButton);

    await waitFor(() => expect(confirmBodies).toHaveLength(1));
    const lines = (confirmBodies[0]?.lines ?? []) as Array<Record<string, unknown>>;
    expect(lines[0]).toEqual(
      expect.objectContaining({
        lineType: "income",
        creditKind: "other",
        incomeTypeId: "inc-refund",
      })
    );
  });

  it("envía isExpectedExpense e expectedExpense en débitos com toggle ON", async () => {
    const confirmBodies: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/v1/bank/ofx-ingest")) {
        return jsonResponse(200, {
          expenses: [
            {
              fitId: "fit-db-1",
              bankAccountId: "bank-1",
              amountInCents: 18074,
              postedAt: "2026-01-05",
              memo: "COPASA",
              suggestedExpenseTypeId: "exp-type-1",
              suggestedAccountId: "acc-1",
              suggestedIsExpectedExpense: true,
              suggestedExpectedExpense: {
                createOrUpdate: {
                  displayName: "COPASA",
                  frequency: "monthly",
                  amountKind: "variable",
                  dueDay: 5,
                },
              },
            },
          ],
        });
      }
      if (url.endsWith("/api/v1/expense-types")) {
        return jsonResponse(200, [{ id: "exp-type-1", name: "Água" }]);
      }
      if (url.endsWith("/api/v1/income-types")) return jsonResponse(200, []);
      if (url.endsWith("/api/v1/accounts")) {
        return jsonResponse(200, [{ id: "acc-1", name: "Conta Principal" }]);
      }
      if (url.endsWith("/api/v1/bank/ofx-matching-context")) return jsonResponse(200, {});
      if (url.endsWith("/api/v1/bank/ofx-confirm")) {
        confirmBodies.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
        return jsonResponse(201, {
          imported: 1,
          expectedExpensesLinked: 0,
          expectedExpensesCreated: 1,
        });
      }
      return jsonResponse(404, { message: "not found" });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const { container } = render(<BankStatementImportModal isOpen={true} onClose={() => {}} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(["OFX"], "jan.ofx", { type: "application/x-ofx" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: /Gerar pré-visualização/i }));

    await screen.findByRole("button", { name: /Confirmar/i });
    const frequencySelect = container.querySelector(
      'select option[value="monthly"]',
    )?.parentElement as HTMLSelectElement | null;
    expect(frequencySelect?.value).toBe("monthly");

    fireEvent.click(screen.getByRole("button", { name: /Confirmar/i }));

    await waitFor(() => expect(confirmBodies).toHaveLength(1));
    const lines = (confirmBodies[0]?.lines ?? []) as Array<Record<string, unknown>>;
    expect(lines[0]).toEqual(
      expect.objectContaining({
        fitId: "fit-db-1",
        isExpectedExpense: true,
        expectedExpense: expect.objectContaining({
          createOrUpdate: expect.objectContaining({ displayName: "COPASA" }),
        }),
      }),
    );
    await waitFor(() =>
      expect(screen.getByText(/memória\(s\) nova\(s\)/i)).toBeInTheDocument(),
    );
  });
});
