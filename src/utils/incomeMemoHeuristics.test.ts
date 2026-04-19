import { describe, expect, it } from "vitest";
import { guessIncomeTypeIdFromMemo } from "./incomeMemoHeuristics";

describe("guessIncomeTypeIdFromMemo", () => {
  const types = [
    { id: "1", name: "Taxa Condominial" },
    { id: "2", name: "Rendimentos Financeiros" },
    { id: "3", name: "Encargos condominiais" },
  ];

  it("memo RENDIMENTOS… → Rendimentos Financeiros", () => {
    const id = guessIncomeTypeIdFromMemo("RENDIMENTOS REND PAGO APLIC AUT MAIS", types);
    expect(id).toBe("2");
  });

  it("memo BOLETOS RECEBIDOS… → Encargos condominiais", () => {
    const id = guessIncomeTypeIdFromMemo("BOLETOS RECEBIDOS 04/03S", types);
    expect(id).toBe("3");
  });

  it("sem match → string vazia", () => {
    expect(guessIncomeTypeIdFromMemo("PIX DESCONHECIDO", types)).toBe("");
  });
});
