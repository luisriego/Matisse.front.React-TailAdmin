import { describe, it, expect } from "vitest";
import { isBankYieldBundleMemo, partitionCreditsForBundleView } from "./ofxBankYieldMemo";

describe("ofxBankYieldMemo", () => {
  it("detecta RENDIMENTOS", () => {
    expect(isBankYieldBundleMemo("RENDIMENTOS POUPANÇA")).toBe(true);
    expect(isBankYieldBundleMemo("TRANSF. RECEBIDA EMP CONTA")).toBe(false);
  });

  it("detecta PAGO APLIC AUT MAIS", () => {
    expect(isBankYieldBundleMemo("REND PAGO APLIC AUT MAIS")).toBe(true);
  });

  it("detecta token REND isolado", () => {
    expect(isBankYieldBundleMemo("CRÉD. REND. EXTRATO")).toBe(true);
  });

  it("particiona índices", () => {
    const { bundleIndices, singleIndices } = partitionCreditsForBundleView([
      { memo: "BOLETO" },
      { memo: "RENDIMENTOS" },
      { memo: "REND PAGO APLIC AUT MAIS" },
    ]);
    expect(bundleIndices).toEqual([1, 2]);
    expect(singleIndices).toEqual([0]);
  });
});
