import { describe, expect, it } from "vitest";
import { buildAccountLedger, mergeLedgerExpenseSources, parseLedgerSourceList } from "./buildAccountLedger";

const ACC = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

describe("parseLedgerSourceList", () => {
  it("aceita envelope { expenses: [...] }", () => {
    const list = parseLedgerSourceList({
      expenses: [{ id: "1", amount: 1, accountId: ACC, dueDate: "2025-01-01", type: { name: "T" } }],
    });
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe("1");
  });
});

describe("mergeLedgerExpenseSources", () => {
  it("deduplica por id", () => {
    const e = { id: "x", amount: 100, accountId: ACC, dueDate: "2025-01-01", type: { name: "A" } };
    const merged = mergeLedgerExpenseSources([e], [e], { expenses: [e] });
    expect(merged).toHaveLength(1);
  });
});

describe("buildAccountLedger", () => {
  it("filtra pela conta e marca saídas/entradas", () => {
    const rows = buildAccountLedger(
      ACC,
      [
        {
          id: "e1",
          amount: 1000,
          description: "Luz",
          dueDate: "2025-06-01",
          paidAt: null,
          createdAt: "2025-06-02",
          account: { id: ACC, name: "Principal" },
          type: { name: "Utilidades" },
        },
        {
          id: "e2",
          amount: 500,
          description: "Outra conta",
          dueDate: "2025-05-01",
          accountId: OTHER,
          type: { name: "X" },
        },
      ],
      [
        {
          id: "i1",
          amount: 2000,
          description: "Quota",
          dueDate: "2025-06-10",
          accountId: ACC,
          type: { name: "Condomínio" },
        },
      ]
    );
    expect(rows).toHaveLength(2);
    const saida = rows.find((r) => r.id === "exp-e1");
    const entrada = rows.find((r) => r.id === "inc-i1");
    expect(saida?.direction).toBe("saida");
    expect(saida?.signedCents).toBe(-1000);
    expect(entrada?.direction).toBe("entrada");
    expect(entrada?.signedCents).toBe(2000);
  });

  it("ordena cronologicamente (mais antigo primeiro)", () => {
    const rows = buildAccountLedger(
      ACC,
      [
        {
          id: "late",
          amount: 100,
          description: "d2",
          dueDate: "2025-08-01",
          accountId: ACC,
          type: { name: "A" },
        },
        {
          id: "early",
          amount: 200,
          description: "d1",
          dueDate: "2025-01-15",
          accountId: ACC,
          type: { name: "B" },
        },
      ],
      []
    );
    expect(rows[0]?.id).toBe("exp-early");
    expect(rows[1]?.id).toBe("exp-late");
  });

  it("aceita dueDate aninhado (date-range API)", () => {
    const rows = buildAccountLedger(
      ACC,
      [
        {
          id: "e",
          amount: 50,
          description: "x",
          dueDate: { date: "2025-03-20" },
          paidAt: null,
          createdAt: { date: "2025-03-21" },
          accountId: ACC,
          type: { name: "T" },
        },
      ],
      []
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sortTime).toBe(new Date("2025-03-20").getTime());
  });

  it("compara accountId sem distinguir maiúsculas", () => {
    const rows = buildAccountLedger(
      ACC.toUpperCase(),
      [{ id: "1", amount: 50, accountId: ACC.toLowerCase(), dueDate: "2025-02-01", type: { name: "T" } }],
      []
    );
    expect(rows).toHaveLength(1);
  });
});
