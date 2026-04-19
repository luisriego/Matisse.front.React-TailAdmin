import { describe, expect, it } from "vitest";
import {
  buildPreviewDrafts,
  rowToCreditDraft,
  rowToExpenseDraft,
} from "./ofxPreviewDrafts";

describe("ofxPreviewDrafts", () => {
  const debitBase = {
    fitId: "fit-debit-1",
    bankAccountId: "bank-1",
    amountInCents: 5000,
    postedAt: "2025-03-15",
    memo: "Test debit",
  };

  it("débito: suggestedExpenseTypeId e suggestedAccountId nos rascunhos", () => {
    const row = {
      ...debitBase,
      suggestedExpenseTypeId: "et-sug",
      suggestedAccountId: "acc-sug",
    };
    const d = rowToExpenseDraft(row);
    expect(d).not.toBeNull();
    expect(d!.expenseTypeId).toBe("et-sug");
    expect(d!.accountId).toBe("acc-sug");
  });

  it("débito: fallback pastAssignments[0] quando sugestões null", () => {
    const row = {
      ...debitBase,
      pastAssignments: [{ expenseTypeId: "et-past", accountId: "acc-past" }],
    };
    const d = rowToExpenseDraft(row);
    expect(d!.expenseTypeId).toBe("et-past");
    expect(d!.accountId).toBe("acc-past");
  });

  it("débito: suggestedExpenseTypeId tem prioridade sobre pastAssignments", () => {
    const row = {
      ...debitBase,
      suggestedExpenseTypeId: "et-direct",
      pastAssignments: [{ expenseTypeId: "et-past", accountId: "acc-past" }],
    };
    const d = rowToExpenseDraft(row);
    expect(d!.expenseTypeId).toBe("et-direct");
    expect(d!.accountId).toBe("acc-past");
  });

  it("débito: embeddingCandidates[0].candidateId como expenseTypeId", () => {
    const row = {
      ...debitBase,
      embeddingCandidates: [{ candidateId: "et-emb" }],
    };
    const d = rowToExpenseDraft(row);
    expect(d!.expenseTypeId).toBe("et-emb");
  });

  it("débito: needs_review ainda preenche e marca revisão humana", () => {
    const row = {
      ...debitBase,
      status: "needs_review",
      suggestedExpenseTypeId: "et-1",
      suggestedAccountId: "acc-1",
    };
    const d = rowToExpenseDraft(row);
    expect(d!.expenseTypeId).toBe("et-1");
    expect(d!.accountId).toBe("acc-1");
    expect(d!.needsHumanReview).toBe(true);
  });

  it("crédito: suggestedCreditKind other + suggestedIncomeTypeId", () => {
    const row = {
      fitId: "fit-cr-1",
      bankAccountId: "bank-1",
      amountInCents: 1200,
      postedAt: "2025-03-10",
      memo: "RENDIMENTOS",
      suggestedCreditKind: "other",
      suggestedIncomeTypeId: "inc-type-1",
    };
    const c = rowToCreditDraft(row, "");
    expect(c).not.toBeNull();
    expect(c!.creditKind).toBe("other");
    expect(c!.incomeTypeId).toBe("inc-type-1");
  });

  it("crédito: pastIncomeAssignments[0].incomeTypeId quando suggestedIncomeTypeId ausente", () => {
    const row = {
      fitId: "fit-cr-2",
      bankAccountId: "bank-1",
      amountInCents: 800,
      postedAt: "2025-03-11",
      memo: "Outro crédito",
      suggestedCreditKind: "other",
      pastIncomeAssignments: [{ incomeTypeId: "inc-from-history" }],
    };
    const c = rowToCreditDraft(row, "");
    expect(c!.creditKind).toBe("other");
    expect(c!.incomeTypeId).toBe("inc-from-history");
  });

  it("buildPreviewDrafts: expenses + credits no mesmo payload", () => {
    const { expenseDrafts, creditDrafts } = buildPreviewDrafts({
      expenses: [
        {
          ...debitBase,
          suggestedExpenseTypeId: "et-x",
          suggestedAccountId: "acc-x",
        },
      ],
      credits: [
        {
          fitId: "c1",
          bankAccountId: "bank-1",
          amountInCents: 100,
          postedAt: "2025-03-01",
          memo: "BOLETOS",
          suggestedCreditKind: "boleto_settlement",
        },
      ],
    });
    expect(expenseDrafts).toHaveLength(1);
    expect(expenseDrafts[0]!.expenseTypeId).toBe("et-x");
    expect(creditDrafts).toHaveLength(1);
    expect(creditDrafts[0]!.creditKind).toBe("boleto_settlement");
    expect(creditDrafts[0]!.incomeTypeId).toBe("");
  });
});
