export type ParsedResidentUnitDraft = {
  unit: string;
  idealFraction: number;
};

const UNIT_MAX_LEN = 10;

function parseFractionToken(raw: string): number | null {
  const trimmed = raw.trim();
  let normalized = trimmed;
  if (trimmed.includes(",") && trimmed.includes(".")) {
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (trimmed.includes(",")) {
    normalized = trimmed.replace(",", ".");
  }
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Reparte 1.0 em partes iguais; última unidade absorve arredondamento. */
export function distributeEqualIdealFractions(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [1];
  const base = Math.floor((1 / count) * 1_000_000) / 1_000_000;
  const fractions = Array.from({ length: count }, () => base);
  const sumExceptLast = base * (count - 1);
  fractions[count - 1] = Math.round((1 - sumExceptLast) * 1_000_000) / 1_000_000;
  return fractions;
}

/**
 * Linhas: `Apto 501,0.2576` ou só `101` (fração igual 1/N).
 * Formato do sample: samples/cinco-apartamentos.txt
 */
export function parseBulkResidentUnitLines(lines: string[]): ParsedResidentUnitDraft[] {
  const trimmed = lines.map((l) => l.trim()).filter((l) => l.length > 0);
  if (trimmed.length === 0) return [];

  const drafts: Array<{ unit: string; idealFraction: number | null }> = [];

  for (const line of trimmed) {
    const parts = line.split(/[,;\t]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) continue;

    const unit = parts[0]!;
    if (unit.length > UNIT_MAX_LEN) {
      throw new Error(
        `Unidade "${unit}" excede ${UNIT_MAX_LEN} caracteres (limite da API).`,
      );
    }

    if (parts.length >= 2) {
      const idealFraction = parseFractionToken(parts[1]!);
      if (idealFraction === null) {
        throw new Error(
          `Fração ideal inválida na linha "${line}". Use formato como 0,2576 ou 0.2576.`,
        );
      }
      drafts.push({ unit, idealFraction });
    } else {
      drafts.push({ unit, idealFraction: null });
    }
  }

  if (drafts.length === 0) return [];

  const allHaveFraction = drafts.every((d) => d.idealFraction !== null);
  const noneHaveFraction = drafts.every((d) => d.idealFraction === null);

  if (noneHaveFraction) {
    const fractions = distributeEqualIdealFractions(drafts.length);
    return drafts.map((d, i) => ({
      unit: d.unit,
      idealFraction: fractions[i]!,
    }));
  }

  if (!allHaveFraction) {
    throw new Error(
      "Formato inconsistente: indique fração ideal em todas as linhas (Apto 101,0,1813) ou em nenhuma (será repartido 1/N).",
    );
  }

  return drafts as ParsedResidentUnitDraft[];
}

export function buildResidentUnitCreateBody(draft: ParsedResidentUnitDraft): Record<string, unknown> {
  const id = crypto.randomUUID();
  const idealFraction =
    Math.round(draft.idealFraction * 1e8) / 1e8;
  return {
    id,
    unit: draft.unit,
    idealFraction,
    notificationRecipients: [],
  };
}
