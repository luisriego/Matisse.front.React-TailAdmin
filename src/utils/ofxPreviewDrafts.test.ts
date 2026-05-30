import { describe, expect, it } from "vitest";
import { buildExpectedExpenseConfirmPayload } from "./expectedExpenseDraft";
import { rowToExpenseDraft } from "./ofxPreviewDrafts";

describe("ofxPreviewDrafts expected expense", () => {
  it("parseia suggestedIsExpectedExpense e suggestedExpectedExpense", () => {
    const draft = rowToExpenseDraft({
      fitId: "f1",
      bankAccountId: "bank-1",
      amountInCents: 18074,
      postedAt: "2026-01-05",
      memo: "COPASA",
      suggestedIsExpectedExpense: true,
      suggestedExpectedExpense: {
        createOrUpdate: {
          displayName: "COPASA",
          frequency: "monthly",
          amountKind: "variable",
          dueDay: 5,
        },
      },
    });
    expect(draft?.isExpectedExpense).toBe(true);
    expect(draft?.suggestedExpectedExpense?.createOrUpdate?.displayName).toBe("COPASA");
  });

  it("default isExpectedExpense true quando omitido", () => {
    const draft = rowToExpenseDraft({
      fitId: "f2",
      bankAccountId: "bank-1",
      amountInCents: 1000,
      postedAt: "2026-01-05",
      memo: "MULTA",
    });
    expect(draft?.isExpectedExpense).toBe(true);
  });

  it("buildExpectedExpenseConfirmPayload omite quando pontual", () => {
    expect(
      buildExpectedExpenseConfirmPayload({
        fitId: "f2",
        bankAccountId: "bank-1",
        amountInCents: 1000,
        postedAt: "2026-01-05",
        memo: "MULTA",
        expenseTypeId: "",
        accountId: "",
        dueDate: "2026-01-05",
        description: "",
        recurringExpenseId: "",
        residentUnitId: "",
        isExpectedExpense: false,
        suggestedExpectedExpense: null,
        expectedExpenseEdit: null,
      }),
    ).toEqual({ isExpectedExpense: false });
  });
});
