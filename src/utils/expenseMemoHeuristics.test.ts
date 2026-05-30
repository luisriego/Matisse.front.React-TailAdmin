import { describe, expect, it } from "vitest";
import { guessExpenseTypeIdForTarMemo, isTarBankFeeMemo } from "./expenseMemoHeuristics";

describe("isTarBankFeeMemo", () => {
  it("detecta TAR CONTA, TAR COBRANCA, TAR PIX e TAR noutra posição", () => {
    expect(isTarBankFeeMemo("TAR CONTA MANUTENCAO")).toBe(true);
    expect(isTarBankFeeMemo("TAR COBRANCA")).toBe(true);
    expect(isTarBankFeeMemo("TAR PIX")).toBe(true);
    expect(isTarBankFeeMemo("TAR_CONTA")).toBe(true);
    expect(isTarBankFeeMemo("SERVICO TAR COBRANCA")).toBe(true);
    expect(isTarBankFeeMemo("TARIFA MENSAL")).toBe(true);
  });

  it("não confunde com outras palavras", () => {
    expect(isTarBankFeeMemo("STAR LABS")).toBe(false);
    expect(isTarBankFeeMemo("tartaruga")).toBe(false);
    expect(isTarBankFeeMemo("BOLETO PAGO")).toBe(false);
  });
});

describe("guessExpenseTypeIdForTarMemo", () => {
  const types = [
    { id: "a1", name: "Limpeza" },
    { id: "a2", name: "Despesas bancárias" },
    { id: "a3", name: "Despesa bancária" },
  ];

  it("TAR… → Despesas bancárias", () => {
    expect(guessExpenseTypeIdForTarMemo("TAR CONTA", types)).toBe("a2");
  });

  it("aceita nome com bancária/banca", () => {
    const onlyBank = [{ id: "x1", name: "Despesa bancária" }];
    expect(guessExpenseTypeIdForTarMemo("TAR PIX", onlyBank)).toBe("x1");
  });

  it("sem TAR → vazio", () => {
    expect(guessExpenseTypeIdForTarMemo("PIX ENVIADO", types)).toBe("");
  });
});
