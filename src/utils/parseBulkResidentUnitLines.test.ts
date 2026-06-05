import { describe, expect, it } from "vitest";
import {
  distributeEqualIdealFractions,
  parseBulkResidentUnitLines,
} from "./parseBulkResidentUnitLines";

describe("parseBulkResidentUnitLines", () => {
  it("parseia unit,fração como no sample cinco-apartamentos.txt", () => {
    const rows = parseBulkResidentUnitLines([
      "Apto 501,0.2576",
      "Apto 301,0.1813",
      "Apto 101,0.1813",
    ]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      unit: "Apto 501",
      idealFraction: 0.2576,
      email: "",
    });
    expect(rows[1]?.idealFraction).toBe(0.1813);
  });

  it("parseia formato com traços e e-mail", () => {
    const rows = parseBulkResidentUnitLines([
      "Apto. 401 - 0,145678 - residente@example.com",
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      unit: "Apto. 401",
      idealFraction: 0.145678,
      email: "residente@example.com",
    });
  });

  it("reparte 1/N quando só há nomes de unidade", () => {
    const rows = parseBulkResidentUnitLines(["101", "102", "103", "104"]);
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.idealFraction > 0)).toBe(true);
    const sum = rows.reduce((s, r) => s + r.idealFraction, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("rejeita fração zero ou ausente misturada", () => {
    expect(() =>
      parseBulkResidentUnitLines(["Apto 101,0.2", "Apto 102"]),
    ).toThrow(/inconsistente/i);
  });

  it("rejeita e-mail inválido", () => {
    expect(() =>
      parseBulkResidentUnitLines(["Apto 101,0.2,not-an-email"]),
    ).toThrow(/E-mail inválido/i);
  });
});

describe("distributeEqualIdealFractions", () => {
  it("soma 1.0 para 5 unidades", () => {
    const f = distributeEqualIdealFractions(5);
    expect(f).toHaveLength(5);
    expect(f.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
});
