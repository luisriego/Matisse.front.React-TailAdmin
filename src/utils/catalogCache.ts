
export const API_EXPENSE_TYPES = "/api/v1/expense-types";
export const API_INCOME_TYPES = "/api/v1/income-types";

export const CATALOG_STORAGE_KEYS = {
  expenseTypes: "catalog.expenseTypes.v1",
  incomeTypes: "catalog.incomeTypes.v1",
} as const;

export function parseListResponse<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const keys = [
      "data",
      "content",
      "items",
      "results",
      "types",
      "incomeTypes",
      "income_types",
      "expenseTypes",
      "expense_types",
      "hydra:member",
    ] as const;
    for (const key of keys) {
      const val = o[key];
      if (Array.isArray(val)) return val as T[];
    }
    if (o.data && typeof o.data === "object") {
      return parseListResponse<T>(o.data);
    }
  }
  return [];
}


export async function prefetchCatalogTypes(token: string): Promise<void> {
  const headers = { Authorization: `Bearer ${token}` };

  const [expRes, incRes] = await Promise.all([
    fetch(API_EXPENSE_TYPES, { headers }),
    fetch(API_INCOME_TYPES, { headers }),
  ]);

  if (expRes.ok) {
    try {
      const raw = await expRes.json();
      const list = parseListResponse<unknown>(raw);
      localStorage.setItem(CATALOG_STORAGE_KEYS.expenseTypes, JSON.stringify(list));
    } catch {
      
    }
  }

  if (incRes.ok) {
    try {
      const raw = await incRes.json();
      const list = parseListResponse<unknown>(raw);
      localStorage.setItem(CATALOG_STORAGE_KEYS.incomeTypes, JSON.stringify(list));
    } catch {
      
    }
  }
}

export function readCachedExpenseTypes<T>(): T[] {
  try {
    const s = localStorage.getItem(CATALOG_STORAGE_KEYS.expenseTypes);
    if (!s) return [];
    return parseListResponse<T>(JSON.parse(s));
  } catch {
    return [];
  }
}

export function readCachedIncomeTypes<T>(): T[] {
  try {
    const s = localStorage.getItem(CATALOG_STORAGE_KEYS.incomeTypes);
    if (!s) return [];
    return parseListResponse<T>(JSON.parse(s));
  } catch {
    return [];
  }
}
