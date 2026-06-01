import {
  extractApiErrorMessage,
  translateResidentUnitCreateError,
} from "./extractApiErrorMessage";
import { fetchActiveResidentUnits } from "./fetchActiveResidentUnits";
import {
  buildResidentUnitCreateBody,
  type ParsedResidentUnitDraft,
} from "./parseBulkResidentUnitLines";

async function createOneResidentUnit(
  token: string,
  draft: ParsedResidentUnitDraft,
): Promise<void> {
  const res = await fetch("/api/v1/resident-unit/create", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(buildResidentUnitCreateBody(draft)),
  });

  if (!res.ok) {
    const raw = await extractApiErrorMessage(
      res,
      `Erro ao criar a unidade ${draft.unit}`,
    );
    throw new Error(translateResidentUnitCreateError(raw, draft.unit));
  }
}

export type CreateResidentUnitsResult = {
  created: number;
  skipped: string[];
};

/**
 * Cria unidades uma a uma (evita corrida na validação de soma no Symfony)
 * e ignora nomes que já existem em GET /actives.
 */
export async function createResidentUnitsBatch(
  token: string,
  drafts: ParsedResidentUnitDraft[],
): Promise<CreateResidentUnitsResult> {
  const existing = await fetchActiveResidentUnits(token);
  const existingNames = new Set(
    existing.map((u) => u.unit.trim().toLowerCase()),
  );

  const skipped = drafts
    .filter((d) => existingNames.has(d.unit.trim().toLowerCase()))
    .map((d) => d.unit);

  const toCreate = drafts.filter(
    (d) => !existingNames.has(d.unit.trim().toLowerCase()),
  );

  for (const draft of toCreate) {
    await createOneResidentUnit(token, draft);
  }

  return { created: toCreate.length, skipped };
}
