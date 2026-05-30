import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  findLatestMonthWithExpenseActivity,
  getDefaultAccountingMonthDate,
  getDefaultAccountingMonthPeriod,
  isValidAccountingPeriod,
  LAST_IMPORTED_STATEMENT_PERIOD_KEY,
} from "./defaultAccountingMonth";

describe("isValidAccountingPeriod", () => {
  it("aceita YYYY-MM válidos", () => {
    expect(isValidAccountingPeriod("2026-01")).toBe(true);
    expect(isValidAccountingPeriod("2026-12")).toBe(true);
  });

  it("rejeita formato ou mês inválido", () => {
    expect(isValidAccountingPeriod("2026-1")).toBe(false);
    expect(isValidAccountingPeriod("2026-13")).toBe(false);
    expect(isValidAccountingPeriod("26-04")).toBe(false);
    expect(isValidAccountingPeriod("")).toBe(false);
  });
});

describe("getDefaultAccountingMonthPeriod", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("usa o período guardado no localStorage quando válido", () => {
    localStorage.setItem(LAST_IMPORTED_STATEMENT_PERIOD_KEY, "2025-11");
    expect(getDefaultAccountingMonthPeriod()).toBe("2025-11");
  });

  it("ignora período inválido no localStorage e usa o mês calendário anterior", () => {
    localStorage.setItem(LAST_IMPORTED_STATEMENT_PERIOD_KEY, "invalid");
    expect(getDefaultAccountingMonthPeriod()).toBe("2026-03");
  });
});

describe("getDefaultAccountingMonthDate", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("devolve o primeiro dia do mês do período por defeito", () => {
    const d = getDefaultAccountingMonthDate();
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(1);
  });

  it("respeita o período importado no localStorage", () => {
    localStorage.setItem(LAST_IMPORTED_STATEMENT_PERIOD_KEY, "2026-01");
    const d = getDefaultAccountingMonthDate();
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });
});

describe("findLatestMonthWithExpenseActivity", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("devolve o primeiro dia do mês actual quando há despesas activas", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T10:00:00Z"));
    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes("/api/v1/expenses/date-range/2026/4")) {
        return new Response(JSON.stringify([{ id: "e1" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (u.includes("/api/v1/recurring-expenses/pending-monthly/4/2026")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify([]), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await findLatestMonthWithExpenseActivity("token", 3);
    vi.useRealTimers();

    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2026);
    expect(result!.getMonth()).toBe(3);
    expect(result!.getDate()).toBe(1);
  });

  it("devolve null quando nunca há dados dentro do limite", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const result = await findLatestMonthWithExpenseActivity("token", 2);
    expect(result).toBeNull();
  });
});
