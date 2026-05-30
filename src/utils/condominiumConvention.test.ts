import { beforeEach, describe, expect, it } from "vitest";
import {
  clearConvention,
  listConventionMonths,
  loadConventionForMonth,
  resolveConventionForMonth,
  saveConventionForMonth,
} from "./condominiumConvention";

describe("condominiumConvention", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("guarda e recupera parâmetros por mês", () => {
    saveConventionForMonth("2026-01", {
      extraFee: "250,00",
      reserveFund: "93,70",
      syndicFee: "600,00",
      syndicDistribution: "EQUAL",
      gasPricePerM3: "26,00",
    });

    const jan = loadConventionForMonth("2026-01");
    expect(jan.extraFee).toBe("250,00");
    expect(jan.gasPricePerM3).toBe("26,00");
    expect(listConventionMonths()).toEqual(["2026-01"]);
  });

  it("herda do último mês anterior quando não há entrada explícita", () => {
    saveConventionForMonth("2026-01", {
      extraFee: "250,00",
      reserveFund: "93,70",
      syndicFee: "600,00",
      syndicDistribution: "EQUAL",
      gasPricePerM3: "26,00",
    });

    const mar = resolveConventionForMonth("2026-03");
    expect(mar.extraFee).toBe("250,00");
    expect(mar.syndicFee).toBe("600,00");
    expect(listConventionMonths()).toEqual(["2026-01"]);
  });

  it("usa valores do mês mais recente <= alvo", () => {
    saveConventionForMonth("2026-01", {
      extraFee: "250,00",
      reserveFund: "93,70",
      syndicFee: "600,00",
      syndicDistribution: "EQUAL",
      gasPricePerM3: "26,00",
    });
    saveConventionForMonth("2026-04", {
      extraFee: "280,00",
      reserveFund: "93,70",
      syndicFee: "600,00",
      syndicDistribution: "EQUAL",
      gasPricePerM3: "27,00",
    });

    const mar = resolveConventionForMonth("2026-03");
    expect(mar.extraFee).toBe("250,00");

    const abr = resolveConventionForMonth("2026-04");
    expect(abr.extraFee).toBe("280,00");
    expect(abr.gasPricePerM3).toBe("27,00");
  });

  it("clearConvention remove o histórico", () => {
    saveConventionForMonth("2026-01", {
      extraFee: "250,00",
      reserveFund: "",
      syndicFee: "600,00",
      syndicDistribution: "EQUAL",
      gasPricePerM3: "",
    });
    clearConvention();
    expect(listConventionMonths()).toEqual([]);
    expect(resolveConventionForMonth("2026-01").extraFee).toBe("");
  });
});
