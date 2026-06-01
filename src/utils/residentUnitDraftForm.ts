import {
  distributeEqualIdealFractions,
  parseBulkResidentUnitLines,
  type ParsedResidentUnitDraft,
} from "./parseBulkResidentUnitLines";

export const UNIT_MAX_LEN = 10;

export type ResidentUnitDraftRow = {
  key: string;
  unit: string;
  idealFraction: string;
};

export type RowFieldErrors = {
  unit?: string;
  idealFraction?: string;
};

let rowKeyCounter = 0;

export function newDraftRow(partial?: Partial<ResidentUnitDraftRow>): ResidentUnitDraftRow {
  rowKeyCounter += 1;
  return {
    key: partial?.key ?? `row-${rowKeyCounter}`,
    unit: partial?.unit ?? "",
    idealFraction: partial?.idealFraction ?? "",
  };
}

export function createDefaultDraftRows(count = 3): ResidentUnitDraftRow[] {
  return Array.from({ length: count }, () => newDraftRow());
}

export function parseFractionInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
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

export function sumFractionInputs(rows: ResidentUnitDraftRow[]): number {
  return rows.reduce((sum, row) => {
    const n = parseFractionInput(row.idealFraction);
    return sum + (n ?? 0);
  }, 0);
}

export function applyEqualFractionsToRows(
  rows: ResidentUnitDraftRow[],
): ResidentUnitDraftRow[] {
  const filled = rows.filter((r) => r.unit.trim() !== "");
  const target = filled.length > 0 ? filled : rows;
  const fractions = distributeEqualIdealFractions(target.length);
  let i = 0;
  return rows.map((row) => {
    const isTarget =
      filled.length > 0 ? row.unit.trim() !== "" : true;
    if (!isTarget) return row;
    const fraction = fractions[i]!;
    i += 1;
    return {
      ...row,
      idealFraction: String(fraction),
    };
  });
}

export function draftsFromTextLines(text: string): ResidentUnitDraftRow[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const parsed = parseBulkResidentUnitLines(lines);
  return parsed.map((d) =>
    newDraftRow({ unit: d.unit, idealFraction: String(d.idealFraction) }),
  );
}

export function validateDraftRows(rows: ResidentUnitDraftRow[]): {
  rowErrors: Record<string, RowFieldErrors>;
  formError: string | null;
} {
  const rowErrors: Record<string, RowFieldErrors> = {};
  const filled = rows.filter((r) => r.unit.trim() || r.idealFraction.trim());

  if (filled.length === 0) {
    return { rowErrors, formError: "Adicione pelo menos uma unidade." };
  }

  for (const row of filled) {
    const errs: RowFieldErrors = {};
    const unit = row.unit.trim();
    if (!unit) {
      errs.unit = "Indique o nome da unidade.";
    } else if (unit.length > UNIT_MAX_LEN) {
      errs.unit = `Máximo ${UNIT_MAX_LEN} caracteres.`;
    }

    const fraction = parseFractionInput(row.idealFraction);
    if (fraction === null) {
      errs.idealFraction = "Fração ideal obrigatória (> 0).";
    }

    if (Object.keys(errs).length > 0) {
      rowErrors[row.key] = errs;
    }
  }

  if (Object.keys(rowErrors).length > 0) {
    return { rowErrors, formError: null };
  }

  const sum = sumFractionInputs(filled);
  if (Math.abs(sum - 1) > 0.001) {
    return {
      rowErrors,
      formError: `A soma das frações ideiais deve ser 1,0000 (actual: ${sum.toFixed(4)}). Use «Repartir igualmente» ou ajuste os valores.`,
    };
  }

  return { rowErrors, formError: null };
}

export function rowsToParsedDrafts(
  rows: ResidentUnitDraftRow[],
): ParsedResidentUnitDraft[] {
  const { rowErrors, formError } = validateDraftRows(rows);
  if (formError) throw new Error(formError);
  if (Object.keys(rowErrors).length > 0) {
    throw new Error("Corrija os campos assinalados.");
  }

  return rows
    .filter((r) => r.unit.trim())
    .map((r) => ({
      unit: r.unit.trim(),
      idealFraction: parseFractionInput(r.idealFraction)!,
    }));
}
