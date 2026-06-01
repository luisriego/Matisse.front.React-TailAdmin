import { describe, expect, it, vi, afterEach } from "vitest";
import { parseListResponse } from "./catalogCache";
import { fetchTypeCatalogs } from "./fetchTypeCatalogs";

describe("parseListResponse", () => {
  it("desembrulha income_types e data aninhado", () => {
    expect(
      parseListResponse({ income_types: [{ id: "1", name: "Taxa" }] }),
    ).toHaveLength(1);
    expect(
      parseListResponse({ data: { incomeTypes: [{ id: "2" }] } }),
    ).toHaveLength(1);
  });
});

describe("fetchTypeCatalogs", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("parseia array directo de GET /api/v1/income-types", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("expense-types")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ["services"],
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            { id: "i1", name: "Taxa Condominial", code: "RC1TC" },
          ],
        });
      }),
    );

    const result = await fetchTypeCatalogs("token");
    expect(result.incomeTypes).toHaveLength(1);
    expect(result.expenseTypes).toHaveLength(1);
    expect(result.incomeTypesHint).toBeNull();
  });
});
