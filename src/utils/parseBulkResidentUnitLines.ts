export type ParsedResidentUnitDraft = {
  unit: string;
  idealFraction: number;
  email: string;
  name?: string;
};

const UNIT_MAX_LEN = 10;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidResidentEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

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

function splitLineTokens(line: string): string[] {
  const trimmed = line.trim();
  if (/\s-\s/.test(trimmed)) {
    return trimmed.split(/\s*-\s*/).map((p) => p.trim()).filter(Boolean);
  }

  const parts = trimmed
    .split(/[,;\t]/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 4 && /@/.test(parts[parts.length - 1]!)) {
    const email = parts.pop()!;
    const unit = parts.shift()!;
    const fractionRaw = parts.join(",");
    return [unit, fractionRaw, email];
  }

  return parts;
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
 * Linhas: `Apto 501,0.2576,email@exemplo.com` ou
 * `Apto. 401 - 0,145678 - email@dominio.com` ou só `101` (fração 1/N; e-mail no formulário).
 */
export function parseBulkResidentUnitLines(lines: string[]): ParsedResidentUnitDraft[] {
  const trimmed = lines.map((l) => l.trim()).filter((l) => l.length > 0);
  if (trimmed.length === 0) return [];

  const drafts: Array<{
    unit: string;
    idealFraction: number | null;
    email: string;
    name?: string;
  }> = [];

  for (const line of trimmed) {
    const parts = splitLineTokens(line);
    if (parts.length === 0) continue;

    const unit = parts[0]!;
    if (unit.length > UNIT_MAX_LEN) {
      throw new Error(
        `Unidade "${unit}" excede ${UNIT_MAX_LEN} caracteres (limite da API).`,
      );
    }

    let idealFraction: number | null = null;
    let email = "";
    let name: string | undefined;

    if (parts.length >= 2) {
      idealFraction = parseFractionToken(parts[1]!);
      if (idealFraction === null) {
        throw new Error(
          `Fração ideal inválida na linha "${line}". Use formato como 0,2576 ou 0.2576.`,
        );
      }
    }

    if (parts.length >= 3) {
      email = parts[2]!.trim();
      if (!isValidResidentEmail(email)) {
        throw new Error(`E-mail inválido na linha "${line}".`);
      }
    }

    if (parts.length >= 4) {
      name = parts.slice(3).join(" ").trim() || undefined;
    }

    drafts.push({ unit, idealFraction, email, name });
  }

  if (drafts.length === 0) return [];

  const allHaveFraction = drafts.every((d) => d.idealFraction !== null);
  const noneHaveFraction = drafts.every((d) => d.idealFraction === null);
  const allHaveEmail = drafts.every((d) => d.email.length > 0);
  const anyHaveEmail = drafts.some((d) => d.email.length > 0);

  if (anyHaveEmail && !allHaveEmail) {
    throw new Error(
      "Formato inconsistente: indique e-mail em todas as linhas ou em nenhuma (preencha no formulário).",
    );
  }

  if (noneHaveFraction) {
    const fractions = distributeEqualIdealFractions(drafts.length);
    return drafts.map((d, i) => ({
      unit: d.unit,
      idealFraction: fractions[i]!,
      email: d.email,
      ...(d.name ? { name: d.name } : {}),
    }));
  }

  if (!allHaveFraction) {
    throw new Error(
      "Formato inconsistente: indique fração ideal em todas as linhas (Apto 101,0,1813) ou em nenhuma (será repartido 1/N).",
    );
  }

  return drafts.map((d) => ({
    unit: d.unit,
    idealFraction: d.idealFraction!,
    email: d.email,
    ...(d.name ? { name: d.name } : {}),
  }));
}

export function buildResidentUnitCreateBody(
  draft: ParsedResidentUnitDraft,
): Record<string, unknown> {
  const id = crypto.randomUUID();
  const idealFraction = Math.round(draft.idealFraction * 1e8) / 1e8;
  const body: Record<string, unknown> = {
    id,
    unit: draft.unit,
    idealFraction,
    email: draft.email.trim(),
  };
  if (draft.name?.trim()) {
    body.name = draft.name.trim();
  }
  return body;
}
