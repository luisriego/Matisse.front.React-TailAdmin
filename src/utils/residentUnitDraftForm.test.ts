import { describe, expect, it } from "vitest";
import {
  applyEqualFractionsToRows,
  createDefaultDraftRows,
  draftsFromTextLines,
  newDraftRow,
  rowsToParsedDrafts,
  validateDraftRows,
} from "./residentUnitDraftForm";

describe("residentUnitDraftForm", () => {
  it("importa linhas de texto para filas do formulário", () => {
    const rows = draftsFromTextLines("Apto 501,0.2576\nApto 301,0.1813");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.unit).toBe("Apto 501");
    expect(rows[0]?.idealFraction).toBe("0.2576");
  });

  it("reparte frações iguais nas linhas preenchidas", () => {
    const rows = applyEqualFractionsToRows([
      newDraftRow({ unit: "101", idealFraction: "" }),
      newDraftRow({ unit: "102", idealFraction: "" }),
      newDraftRow({ unit: "", idealFraction: "" }),
    ]);
    const filled = rows.filter((r) => r.unit.trim());
    expect(filled).toHaveLength(2);
    const sum = filled.reduce(
      (s, r) => s + Number(r.idealFraction),
      0,
    );
    expect(sum).toBeCloseTo(1, 5);
  });

  it("exige soma 1 antes de submeter", () => {
    const rows = [
      newDraftRow({ unit: "101", idealFraction: "0.5" }),
      newDraftRow({ unit: "102", idealFraction: "0.3" }),
    ];
    const v = validateDraftRows(rows);
    expect(v.formError).toMatch(/soma/i);
  });

  it("converte filas válidas em drafts da API", () => {
    const rows = createDefaultDraftRows(2).map((r, i) => ({
      ...r,
      unit: `Apto ${101 + i}`,
      idealFraction: i === 0 ? "0.6" : "0.4",
    }));
    const drafts = rowsToParsedDrafts(rows);
    expect(drafts).toHaveLength(2);
    expect(drafts[0]?.idealFraction).toBe(0.6);
  });
});
