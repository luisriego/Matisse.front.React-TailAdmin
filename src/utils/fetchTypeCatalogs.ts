import {
  API_EXPENSE_TYPES,
  API_INCOME_TYPES,
  parseListResponse,
  readCachedExpenseTypes,
  readCachedIncomeTypes,
} from "./catalogCache";

export type CatalogFetchResult = {
  expenseTypes: unknown[];
  incomeTypes: unknown[];
  incomeTypesStatus: number | null;
  incomeTypesHint: string | null;
};

async function loadTypeCatalog(
  url: string,
  token: string,
  readCache: () => unknown[],
): Promise<{ list: unknown[]; status: number | null; hint: string | null }> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const cached = readCache();
    if (cached.length > 0) {
      return {
        list: cached,
        status: res.status,
        hint: `Catálogo em cache (${cached.length} tipo(s)); API respondeu HTTP ${res.status}.`,
      };
    }
    return {
      list: [],
      status: res.status,
      hint: `GET ${url} respondeu HTTP ${res.status}.`,
    };
  }

  const raw: unknown = await res.json().catch(() => null);
  const list = parseListResponse<unknown>(raw);
  if (list.length > 0) {
    return { list, status: res.status, hint: null };
  }

  const cached = readCache();
  if (cached.length > 0) {
    return {
      list: cached,
      status: res.status,
      hint: `Resposta vazia ou formato inesperado; usado cache (${cached.length} tipo(s)).`,
    };
  }

  return {
    list: [],
    status: res.status,
    hint:
      raw === null
        ? `GET ${url} devolveu corpo inválido.`
        : `GET ${url} devolveu 0 tipos (formato: ${typeof raw}).`,
  };
}

export async function fetchTypeCatalogs(token: string): Promise<CatalogFetchResult> {
  const [expense, income] = await Promise.all([
    loadTypeCatalog(API_EXPENSE_TYPES, token, readCachedExpenseTypes),
    loadTypeCatalog(API_INCOME_TYPES, token, readCachedIncomeTypes),
  ]);

  return {
    expenseTypes: expense.list,
    incomeTypes: income.list,
    incomeTypesStatus: income.status,
    incomeTypesHint: income.hint,
  };
}
