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

  it("crédito: normaliza settlementMonth (YYYY-MM-DD -> YYYY-MM)", () => {
    const row = {
      fitId: "fit-cr-3",
      bankAccountId: "bank-1",
      amountInCents: 1500,
      postedAt: "2025-03-20",
      memo: "BOLETOS",
      suggestedCreditKind: "boleto_settlement",
      settlementMonth: "2025-04-01",
    };
    const c = rowToCreditDraft(row, "");
    expect(c).not.toBeNull();
    expect(c!.settlementMonth).toBe("2025-04");
  });

  it("crédito: passthrough de split fallback quando preview já traz campos", () => {
    const row = {
      fitId: "fit-cr-4",
      bankAccountId: "bank-1",
      amountInCents: 2100,
      postedAt: "2025-03-21",
      memo: "BOLETOS",
      suggestedCreditKind: "boleto_settlement",
      settlement_extra_fee_per_unit_cents: "123",
      settlementReserveFundPerUnitCents: 456,
    };
    const c = rowToCreditDraft(row, "");
    expect(c).not.toBeNull();
    expect(c!.settlementExtraFeePerUnitCents).toBe(123);
    expect(c!.settlementReserveFundPerUnitCents).toBe(456);
  });

  it("crédito: fallback de bankAccountId usa conta dos débitos", () => {
    const c = rowToCreditDraft(
      {
        fitId: "fit-cr-fallback-bank",
        amountInCents: 9900,
        postedAt: "2025-03-22",
        memo: "BOLETOS",
      },
      "bank-from-debits"
    );
    expect(c).not.toBeNull();
    expect(c!.bankAccountId).toBe("bank-from-debits");
  });

  it("crédito: amountInCents negativo vira absoluto", () => {
    const c = rowToCreditDraft(
      {
        fitId: "fit-cr-negative",
        bankAccountId: "bank-1",
        amountInCents: -3210,
        postedAt: "2025-03-23",
        memo: "CR",
      },
      ""
    );
    expect(c).not.toBeNull();
    expect(c!.amountInCents).toBe(3210);
  });

  it("crédito: suggested_credit_kind snake_case = other", () => {
    const c = rowToCreditDraft(
      {
        fitId: "fit-cr-snake-kind",
        bankAccountId: "bank-1",
        amountInCents: 1200,
        postedAt: "2025-03-24",
        memo: "JUROS",
        suggested_credit_kind: "other",
      },
      ""
    );
    expect(c).not.toBeNull();
    expect(c!.creditKind).toBe("other");
  });

  it("crédito: kind desconhecido faz fallback para boleto_settlement", () => {
    const c = rowToCreditDraft(
      {
        fitId: "fit-cr-unknown-kind",
        bankAccountId: "bank-1",
        amountInCents: 1000,
        postedAt: "2025-03-25",
        memo: "OUTRO",
        suggestedCreditKind: "unexpected_kind",
      },
      ""
    );
    expect(c).not.toBeNull();
    expect(c!.creditKind).toBe("boleto_settlement");
  });

  it("crédito: settlement_month em YYYY-MM é preservado", () => {
    const c = rowToCreditDraft(
      {
        fitId: "fit-cr-settlement-month",
        bankAccountId: "bank-1",
        amountInCents: 1000,
        postedAt: "2025-03-26",
        memo: "BOLETOS",
        settlement_month: "2025-04",
      },
      ""
    );
    expect(c).not.toBeNull();
    expect(c!.settlementMonth).toBe("2025-04");
  });

  it("crédito: settlementMonth inválido resulta vazio", () => {
    const c = rowToCreditDraft(
      {
        fitId: "fit-cr-invalid-settlement-month",
        bankAccountId: "bank-1",
        amountInCents: 1000,
        postedAt: "2025-03-27",
        memo: "BOLETOS",
        settlementMonth: "abril/2025",
      },
      ""
    );
    expect(c).not.toBeNull();
    expect(c!.settlementMonth).toBe("");
  });

  it("buildPreviewDrafts: usa lineType income/expense para separar linhas", () => {
    const { expenseDrafts, creditDrafts } = buildPreviewDrafts({
      lines: [
        {
          fitId: "fit-line-exp-1",
          bankAccountId: "bank-1",
          amountInCents: 200,
          postedAt: "2025-03-01",
          memo: "Tarifa",
          lineType: "expense",
        },
        {
          fitId: "fit-line-inc-1",
          bankAccountId: "bank-1",
          amountInCents: 500,
          postedAt: "2025-03-01",
          memo: "Crédito",
          lineType: "income",
        },
      ],
    });
    expect(expenseDrafts).toHaveLength(1);
    expect(creditDrafts).toHaveLength(1);
    expect(expenseDrafts[0]!.fitId).toBe("fit-line-exp-1");
    expect(creditDrafts[0]!.fitId).toBe("fit-line-inc-1");
  });

  it("buildPreviewDrafts: deduplica por fitId entre coleções", () => {
    const { expenseDrafts, creditDrafts } = buildPreviewDrafts({
      lines: [
        {
          fitId: "fit-dup-1",
          bankAccountId: "bank-1",
          amountInCents: 100,
          postedAt: "2025-03-02",
          memo: "Primeiro",
          lineType: "expense",
        },
      ],
      transactions: [
        {
          fitId: "fit-dup-1",
          bankAccountId: "bank-1",
          amountInCents: 100,
          postedAt: "2025-03-02",
          memo: "Duplicado",
          lineType: "income",
        },
      ],
    });
    expect(expenseDrafts).toHaveLength(1);
    expect(creditDrafts).toHaveLength(0);
  });

  it("buildPreviewDrafts: créditos herdam fallbackBank quando faltam bankAccountId", () => {
    const { creditDrafts } = buildPreviewDrafts({
      expenses: [
        {
          fitId: "fit-exp-bank-source",
          bankAccountId: "bank-9",
          amountInCents: 100,
          postedAt: "2025-03-03",
          memo: "Débito base",
          lineType: "expense",
        },
      ],
      credits: [
        {
          fitId: "fit-credit-no-bank",
          amountInCents: 200,
          postedAt: "2025-03-03",
          memo: "Crédito sem conta",
          lineType: "income",
        },
      ],
    });
    expect(creditDrafts).toHaveLength(1);
    expect(creditDrafts[0]!.bankAccountId).toBe("bank-9");
  });

  it("buildPreviewDrafts: linhas só com importLineKey (sem fitId) aparecem na revisão", () => {
    const { expenseDrafts, creditDrafts } = buildPreviewDrafts({
      expenses: [
        {
          importLineKey: "imp-exp-1",
          bankAccountId: "bank-1",
          type: "DEBIT",
          amountInCents: 333,
          postedAt: "2025-04-02",
          memo: "Tarifa OFX",
        },
      ],
      credits: [
        {
          importLineKey: "imp-cr-1",
          bankAccountId: "bank-1",
          type: "CREDIT",
          amountInCents: 999,
          postedAt: "2025-04-03",
          memo: "Crédito",
        },
      ],
    });
    expect(expenseDrafts).toHaveLength(1);
    expect(expenseDrafts[0]!.fitId).toBe("imp-exp-1");
    expect(creditDrafts).toHaveLength(1);
    expect(creditDrafts[0]!.fitId).toBe("imp-cr-1");
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
