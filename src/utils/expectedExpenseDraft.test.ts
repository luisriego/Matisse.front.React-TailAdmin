import { describe, expect, it } from "vitest";
import {
  buildExpectedExpenseConfirmPayload,
  buildInitialExpectedExpenseEdit,
  patchDraftForFrequency,
} from "./expectedExpenseDraft";
import type { DraftLine } from "./ofxPreviewDrafts";

function baseDraft(overrides: Partial<DraftLine> = {}): DraftLine {
  return {
    fitId: "f1",
    bankAccountId: "bank-1",
    amountInCents: 22000,
    postedAt: "2026-03-24",
    memo: "GERALDO CARMELUCIO",
    expenseTypeId: "t1",
    accountId: "a1",
    dueDate: "2026-03-24",
    description: "",
    recurringExpenseId: "",
    residentUnitId: "",
    isExpectedExpense: true,
    suggestedExpectedExpense: null,
    expectedExpenseEdit: null,
    ...overrides,
  };
}

describe("expectedExpenseDraft", () => {
  it("sugere bimestral para jardinagem", () => {
    const edit = buildInitialExpectedExpenseEdit(
      {
        memo: "GERALDO",
        postedAt: "2026-03-24",
        suggestedExpectedExpense: null,
        recurringExpenseId: "",
      },
      "Jardinagem e Paisagismo",
    );
    expect(edit?.createOrUpdate?.frequency).toBe("bimonthly");
  });

  it("patchDraftForFrequency pontual desliga previsão", () => {
    const d = baseDraft();
    const patch = patchDraftForFrequency(d, "none");
    expect(patch.isExpectedExpense).toBe(false);
    expect(patch.expectedExpenseEdit).toBeNull();
  });

  it("confirm envia frequency bimonthly editada", () => {
    const d = baseDraft({
      expectedExpenseEdit: buildInitialExpectedExpenseEdit(
        { memo: "x", postedAt: "2026-03-24", suggestedExpectedExpense: null, recurringExpenseId: "" },
        "Jardinagem",
      ),
    });
    const payload = buildExpectedExpenseConfirmPayload(d);
    expect(payload.isExpectedExpense).toBe(true);
    expect(payload.expectedExpense?.createOrUpdate?.frequency).toBe("bimonthly");
  });
});
