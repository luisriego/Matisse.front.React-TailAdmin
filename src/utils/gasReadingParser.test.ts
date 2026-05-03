import { describe, expect, it } from "vitest";
import { parseGasReadingFromUi } from "./gasReadingParser";

describe("parseGasReadingFromUi", () => {
  it("parseia formato pt-BR com milhar e vírgula decimal", () => {
    expect(parseGasReadingFromUi("1.281,343")).toBe(1281.343);
  });

  it("parseia formato sem milhar com vírgula decimal", () => {
    expect(parseGasReadingFromUi("1281,343")).toBe(1281.343);
  });

  it("parseia atalho sem separadores como milésimos", () => {
    expect(parseGasReadingFromUi("1281343")).toBe(1281.343);
  });

  it("aceita ponto como decimal se for o último separador", () => {
    expect(parseGasReadingFromUi("1281.343")).toBe(1281.343);
  });

  it("retorna null para vacío e invalid para texto inválido", () => {
    expect(parseGasReadingFromUi("")).toBeNull();
    expect(parseGasReadingFromUi("abc")).toBe("invalid");
    expect(parseGasReadingFromUi("-1")).toBe("invalid");
  });
});
