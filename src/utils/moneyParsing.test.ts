import { describe, expect, it } from "vitest";
import {
  formatDateYYYYMMDDLocal,
  parseLocalizedDecimalNumber,
  parseMoneyToCentsLocalized,
} from "./moneyParsing";

describe("parseMoneyToCentsLocalized", () => {
  it("coma decimal habitual (5550,09)", () => {
    expect(parseMoneyToCentsLocalized("5550,09")).toBe(555009);
  });

  it("punto milleiro e coma decimal brasileira/europea", () => {
    expect(parseMoneyToCentsLocalized("5.550,09")).toBe(555009);
    expect(parseMoneyToCentsLocalized("1.234.567,89")).toBe(123456789);
  });

  it('punto decimal cando non hai coma (ex.: "5511.13")', () => {
    expect(parseMoneyToCentsLocalized("5511.13")).toBe(551113);
  });

  it("coma unicode ancha desde copiar-pegar", () => {
    expect(parseMoneyToCentsLocalized("5500\uFF0C09")).toBe(550009);
  });

  it("cero válido", () => {
    expect(parseMoneyToCentsLocalized("0")).toBe(0);
    expect(parseMoneyToCentsLocalized("0,")).toBe(0);
  });
});

describe("parseLocalizedDecimalNumber", () => {
  it("milhares com ponto e decimais com vírgula (leituras de gás)", () => {
    expect(parseLocalizedDecimalNumber("1.281,343")).toBeCloseTo(1281.343, 5);
    expect(parseLocalizedDecimalNumber("754,816")).toBeCloseTo(754.816, 5);
  });

  it("só coma ou só ponto nos decimais", () => {
    expect(parseLocalizedDecimalNumber("0,18131761")).toBeCloseTo(0.18131761, 8);
    expect(parseLocalizedDecimalNumber("0.18131761")).toBeCloseTo(0.18131761, 8);
  });

  it("cadeias vazias ou inválidas", () => {
    expect(parseLocalizedDecimalNumber("")).toBe(null);
    expect(parseLocalizedDecimalNumber("x")).toBe(null);
    expect(parseLocalizedDecimalNumber("-1")).toBe(null);
  });

  it("moneyParse alinha com centavos", () => {
    expect(parseMoneyToCentsLocalized("1.281,343")).toBe(128134);
    expect(parseLocalizedDecimalNumber("1.281,343")).toBeCloseTo(1281.343, 5);
  });
});

describe("formatDateYYYYMMDDLocal", () => {
  it("non usa día UTC doutro mes", () => {
    const d = new Date(2026, 4, 9);
    expect(formatDateYYYYMMDDLocal(d)).toBe("2026-05-09");
  });
});
