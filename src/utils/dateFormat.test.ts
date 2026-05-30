import { describe, expect, it } from "vitest";
import { formatDateDMY } from "./dateFormat";

describe("formatDateDMY", () => {
  it("formatea ISO date-only en UTC como dd/MM/yyyy", () => {
    expect(formatDateDMY("2026-04-21")).toBe("21/04/2026");
  });

  it("acepta Date y mantiene calendario UTC", () => {
    expect(formatDateDMY(new Date(Date.UTC(2026, 3, 9)))).toBe("09/04/2026");
  });

  it("devuelve fallback para null, undefined o string inválido", () => {
    expect(formatDateDMY(null)).toBe("N/A");
    expect(formatDateDMY(undefined)).toBe("N/A");
    expect(formatDateDMY("")).toBe("N/A");
    expect(formatDateDMY("no-es-fecha", "—")).toBe("—");
  });
});
