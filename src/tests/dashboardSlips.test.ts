import { describe, it, expect, beforeEach } from "vitest";
import {
  attachUnitLabels,
  collectSlipIdsFromLocalStorage,
  extractSlipsFromListPayload,
} from "../utils/dashboardSlips";

describe("dashboardSlips utils", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("extractSlipsFromListPayload normaliza envelope slips e snake_case", () => {
    const rows = extractSlipsFromListPayload({
      slips: [
        {
          id: "s1",
          resident_unit_id: "u101",
          amount: 113327,
          due_date: "2026-02-09",
          paid_at: null,
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("s1");
    expect(rows[0].residentUnitId).toBe("u101");
    expect(rows[0].amount).toBe(113327);
    expect(rows[0].dueDate).toBe("2026-02-09");
  });

  it("collectSlipIdsFromLocalStorage lê IDs do mês", () => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    localStorage.setItem(
      `slips.generated.ids.${ym}`,
      JSON.stringify(["id-a", "id-b"]),
    );
    expect(collectSlipIdsFromLocalStorage(now.getFullYear(), now.getMonth() + 1)).toEqual([
      "id-a",
      "id-b",
    ]);
  });

  it("attachUnitLabels preenche unitLabel por residentUnitId", () => {
    const labeled = attachUnitLabels(
      [{ id: "s1", residentUnitId: "u101", amount: 100, dueDate: null, paidAt: null }],
      { u101: "101" },
    );
    expect(labeled[0].unitLabel).toBe("101");
  });
});
