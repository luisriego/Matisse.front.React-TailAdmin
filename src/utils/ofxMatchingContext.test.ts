import { describe, expect, it } from "vitest";
import { parseOfxMatchingContext } from "./ofxMatchingContext";

describe("parseOfxMatchingContext", () => {
  it("aceita camelCase", () => {
    const ctx = parseOfxMatchingContext({
      historyWindowMonths: 12,
      windowStartDate: "2025-01-01",
      windowEndDate: "2026-01-17",
      manualDebitClassificationExpected: true,
      debitSqlHistoryAvailable: false,
      debitSemanticIndexAvailable: false,
      creditSqlHistoryAvailable: true,
    });
    expect(ctx?.historyWindowMonths).toBe(12);
    expect(ctx?.manualDebitClassificationExpected).toBe(true);
    expect(ctx?.creditSqlHistoryAvailable).toBe(true);
  });

  it("aceita snake_case", () => {
    const ctx = parseOfxMatchingContext({
      history_window_months: 12,
      window_start_date: "2025-02-01",
      manual_debit_classification_expected: false,
    });
    expect(ctx?.windowStartDate).toBe("2025-02-01");
    expect(ctx?.manualDebitClassificationExpected).toBe(false);
  });
});
