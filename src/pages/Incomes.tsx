import React, { useState, useEffect, useCallback, useMemo } from "react";
import PageMeta from '../components/common/PageMeta';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import ComponentCard from '../components/common/ComponentCard';
import AddIncomeModal from '../components/modal/AddIncomeModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  API_INCOME_TYPES,
  CATALOG_STORAGE_KEYS,
  parseListResponse,
  readCachedIncomeTypes,
} from '../utils/catalogCache';
import { formatDateDMY } from "../utils/dateFormat";
import { parseLedgerSourceList } from "../utils/buildAccountLedger";
import { isBankYieldBundleMemo } from "../utils/ofxBankYieldMemo";

interface ResidentUnit {
  id: string;
  unit: string;
}


interface IncomeType {
  id: string;
  name: string;
  code: string;
  description: string;
}


interface Income {
  id: string;
  description: string;
  amount: number; 
  dueDate: string;
  paidAt?: string | null;
  createdAt?: string;
  residentUnitId: string;
  type: IncomeType; 
}




function extractIncomeRows(raw: unknown): Record<string, unknown>[] {
  const nested = parseLedgerSourceList(raw);
  if (nested.length > 0) return nested;
  return parseListResponse<Record<string, unknown>>(raw);
}

function pickString(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s !== "" && s !== "null") return s;
  }
  return "";
}

/** YYYY-MM do vencimento (evita desvios de fuso com strings só-data). */
function yearMonthFromDateField(raw: string): { y: string; m: string } | null {
  const trimmed = raw.trim();
  const isoDay = /^(\d{4})-(\d{2})(?:-\d{2})?/.exec(trimmed);
  if (isoDay) return { y: isoDay[1], m: isoDay[2] };
  const t = new Date(trimmed).getTime();
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  return {
    y: String(d.getUTCFullYear()),
    m: String(d.getUTCMonth() + 1).padStart(2, "0"),
  };
}

function normalizeIncomeRow(
  row: Record<string, unknown>,
  typesById: Map<string, IncomeType>,
): Income | null {
  const id = pickString(row, ["id"]);
  if (!id) return null;
  const residentUnitId = pickString(row, ["residentUnitId", "resident_unit_id"]);
  const amountRaw = row.amount;
  const amount =
    typeof amountRaw === "number" && Number.isFinite(amountRaw)
      ? amountRaw
      : Number(amountRaw);
  if (!Number.isFinite(amount)) return null;

  const dueDate = pickString(row, ["dueDate", "due_date"]);
  const paidAtRaw = pickString(row, ["paidAt", "paid_at"]);
  const paidAt = paidAtRaw || null;
  const description = pickString(row, ["description", "memo"]) || "";

  const nestedType = row.type;
  let type: IncomeType;
  if (
    nestedType &&
    typeof nestedType === "object" &&
    nestedType !== null &&
    "id" in (nestedType as object)
  ) {
    const t = nestedType as Record<string, unknown>;
    type = {
      id: pickString(t, ["id"]) || "unknown",
      name: pickString(t, ["name"]) || "Não especificado",
      code: pickString(t, ["code"]) || "",
      description: pickString(t, ["description"]) || "",
    };
  } else {
    const typeId = pickString(row, ["typeId", "type_id"]);
    const found = typeId ? typesById.get(typeId) : undefined;
    type =
      found ?? {
        id: typeId || "?",
        name: "Não especificado",
        code: "",
        description: "",
      };
  }

  return {
    id,
    description,
    amount,
    dueDate: dueDate || paidAtRaw || "",
    paidAt,
    createdAt: pickString(row, ["createdAt", "created_at"]) || undefined,
    residentUnitId,
    type,
  };
}

function sortIncomesByDueDateAsc(list: Income[]): Income[] {
  return [...list].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function formatMoneyPtBrCents(amountCents: number): string {
  return (amountCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const monthNamesPt = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const getInitialPeriod = (): string => {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
};

const formatPeriodLabel = (period: string): string => {
  const [year, month] = period.split("-");
  if (!year || !month) return period;
  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11) return period;
  return `${monthNamesPt[monthIndex]} de ${year}`;
};

const buildPeriodOptions = (count: number): string[] => {
  const options: string[] = [];
  const cursor = new Date();
  cursor.setDate(1);
  for (let i = 0; i < count; i += 1) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    options.push(`${year}-${month}`);
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return options;
};

const Incomes: React.FC = () => {
  const [yieldIngressosExpanded, setYieldIngressosExpanded] = useState(false);

  const [residentUnits, setResidentUnits] = useState<ResidentUnit[]>([]);
  const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>(() => readCachedIncomeTypes<IncomeType>());
  const [rawIncomeRows, setRawIncomeRows] = useState<Record<string, unknown>[]>([]);

  const [loadingIncomes, setLoadingIncomes] = useState(true);
  const [incomesError, setIncomesError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(getInitialPeriod());

  
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token não encontrado.");

        
        const unitsResponse = await fetch('/api/v1/resident-unit/actives', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!unitsResponse.ok) throw new Error('Falha ao carregar unidades residenciais.');
        const unitsRaw: unknown = await unitsResponse.json();
        setResidentUnits(parseListResponse<ResidentUnit>(unitsRaw));

        const incTypesResponse = await fetch(API_INCOME_TYPES, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (incTypesResponse.ok) {
          const raw = await incTypesResponse.json();
          const list = parseListResponse<IncomeType>(raw);
          setIncomeTypes(list);
          try {
            localStorage.setItem(CATALOG_STORAGE_KEYS.incomeTypes, JSON.stringify(list));
          } catch {
            
          }
        } else {
          const cached = readCachedIncomeTypes<IncomeType>();
          if (cached.length > 0) setIncomeTypes(cached);
        }

      } catch (err) {
        console.error("Erro ao carregar dados iniciais:", err);
      }
    };
    fetchInitialData();
  }, []);

  const incomeTypesById = useMemo(() => {
    const m = new Map<string, IncomeType>();
    for (const t of incomeTypes) {
      m.set(t.id, t);
    }
    return m;
  }, [incomeTypes]);

  const incomes = useMemo(
    () =>
      rawIncomeRows
        .map((r) => normalizeIncomeRow(r, incomeTypesById))
        .filter((x): x is Income => x !== null),
    [rawIncomeRows, incomeTypesById],
  );

  const fetchIncomes = useCallback(async () => {
    setLoadingIncomes(true);
    setIncomesError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token de autenticação não encontrado.");
      }

      
      const response = await fetch(`/api/v1/incomes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setRawIncomeRows([]);
          console.warn("Endpoint para buscar ingressos no encontrado (404). Mostrando lista vacía.");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const raw = await response.json();
      setRawIncomeRows(extractIncomeRows(raw));
    } catch (err: any) {
      setIncomesError('Falha ao carregar os ingressos.');
      console.error("Failed to fetch incomes:", err);
    } finally {
      setLoadingIncomes(false);
    }
  }, []);

  
  useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);

  const periodOptions = buildPeriodOptions(24);
  const filteredIncomes = useMemo(() => {
    const [year, month] = selectedPeriod.split("-");
    if (!year || !month) return incomes;
    return incomes.filter((income) => {
      const ym =
        yearMonthFromDateField(income.dueDate) ??
        (income.paidAt ? yearMonthFromDateField(income.paidAt) : null);
      if (!ym) return false;
      return ym.y === year && ym.m === month;
    });
  }, [incomes, selectedPeriod]);

  useEffect(() => {
    setYieldIngressosExpanded(false);
  }, [selectedPeriod]);

  const { yieldBundleRows, singlesRows } = useMemo(() => {
    const bundle: Income[] = [];
    const singles: Income[] = [];
    for (const inc of filteredIncomes) {
      if (isBankYieldBundleMemo(inc.description)) bundle.push(inc);
      else singles.push(inc);
    }
    return {
      yieldBundleRows: sortIncomesByDueDateAsc(bundle),
      singlesRows: sortIncomesByDueDateAsc(singles),
    };
  }, [filteredIncomes]);

  const unitDisplay = (inc: Income): string => {
    const unit = residentUnits.find((u) => u.id === inc.residentUnitId);
    return unit ? unit.unit : "Geral";
  };

  const renderIncomeDataRow = (inc: Income, opts?: { detail?: boolean }) => {
    const detail = opts?.detail ?? false;
    return (
      <TableRow
        key={inc.id}
        className={
          detail
            ? "border-l-4 border-brand-200/80 bg-gray-50/90 text-theme-sm dark:border-brand-800 dark:bg-gray-900/45"
            : undefined
        }
      >
        <TableCell
          className={`w-[26%] min-w-[11rem] px-5 py-4 pr-8 text-theme-sm sm:px-6 ${detail ? "pl-10" : ""}`}
        >
          <span className="font-medium text-gray-800 dark:text-white/90">
            {inc.type?.name || "Não especificado"}
          </span>
        </TableCell>
        <TableCell className="w-[11%] min-w-[6.5rem] whitespace-nowrap px-3 py-4 text-right text-theme-sm text-gray-800 dark:text-white/90">
          {formatMoneyPtBrCents(inc.amount)}
        </TableCell>
        <TableCell className="w-[13%] min-w-[7rem] px-4 py-4 text-theme-sm text-gray-500 sm:px-5 dark:text-gray-400">
          {unitDisplay(inc)}
        </TableCell>
        <TableCell className="min-w-[18rem] w-[50%] max-w-none pl-6 pr-5 py-4 text-theme-sm text-gray-700 sm:pr-6 dark:text-gray-300">
          <span className={detail ? "line-clamp-3" : undefined} title={inc.description}>
            {inc.description}
          </span>
          <span className="mt-0.5 block text-[11px] leading-tight text-gray-400 tabular-nums dark:text-gray-500">
            Venc. {formatDateDMY(inc.dueDate)}
          </span>
        </TableCell>
      </TableRow>
    );
  };

  const yieldBundleTotalCents =
    yieldBundleRows.length > 0
      ? yieldBundleRows.reduce((sum, r) => sum + r.amount, 0)
      : 0;
  const yieldDueLabel =
    yieldBundleRows.length === 0
      ? ""
      : (() => {
          const a = yieldBundleRows[0]!;
          const b = yieldBundleRows[yieldBundleRows.length - 1]!;
          const da = formatDateDMY(a.dueDate);
          const db = formatDateDMY(b.dueDate);
          return da === db ? da : `${da} — ${db}`;
        })();
  const yieldBundleDescText = (() => {
    if (yieldBundleRows.length === 0) return "";
    const uniq = [
      ...new Set(
        yieldBundleRows.map((r) => r.description.trim()).filter(Boolean),
      ),
    ];
    if (uniq.length === 1) return uniq[0]!;
    if (uniq.length === 0) return "Rendimentos agrupados.";
    return uniq.slice(0, 2).join(" · ") + (uniq.length > 2 ? "…" : "");
  })();

  const yieldUnitsUniq = [...new Set(yieldBundleRows.map(unitDisplay))];
  const yieldUnitLabel =
    yieldUnitsUniq.length === 0 ? "—" : yieldUnitsUniq.length === 1 ? yieldUnitsUniq[0]! : "várias";

  return (
    <>
      <PageMeta
        title="Ingressos | Matisse"
        description="Página para registro de novos ingressos"
      />
      <PageBreadcrumb pageTitle="Ingressos" />

      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Mês/Ano</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900"
            >
              {periodOptions.map((period) => (
                <option key={period} value={period}>
                  {formatPeriodLabel(period)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ComponentCard
          title={`Ingressos de ${formatPeriodLabel(selectedPeriod)}`}
          headerContent={
            <button onClick={() => setIsAddModalOpen(true)} className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition bg-brand-500 rounded-lg shadow-theme-xs text-white hover:bg-brand-600 disabled:bg-brand-300">
              Novo Ingresso
              <span className="flex items-center">+</span>
            </button>
          }
        >
          {loadingIncomes ? (
            <p className="text-center">Carregando ingressos...</p>
          ) : incomesError ? (
            <p className="text-center text-error-500">{incomesError}</p>
          ) : filteredIncomes.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400">
              {incomes.length > 0 ? (
                <>
                  Não há ingressos com vencimento em{" "}
                  <strong>{formatPeriodLabel(selectedPeriod)}</strong>. Na API existem{" "}
                  <strong>{incomes.length}</strong> ingresso(s) noutros períodos — altere o filtro
                  «Mês/Ano» (ex.: data de <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">due_date</code> na base).
                </>
              ) : (
                "Nenhum ingresso registrado no período selecionado."
              )}
            </p>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[720px] table-fixed border-collapse">
                  <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    <TableRow>
                      <TableCell
                        isHeader
                        className="w-[26%] min-w-[11rem] px-5 py-3 pr-8 text-left font-medium text-theme-xs text-gray-500 dark:text-gray-400"
                      >
                        Tipo
                      </TableCell>
                      <TableCell
                        isHeader
                        className="w-[11%] min-w-[6.5rem] px-3 py-3 text-right font-medium text-theme-xs text-gray-500 dark:text-gray-400"
                      >
                        Monto
                      </TableCell>
                      <TableCell
                        isHeader
                        className="w-[13%] min-w-[7rem] px-4 py-3 text-left font-medium text-theme-xs text-gray-500 sm:px-5 dark:text-gray-400"
                      >
                        Unidade
                      </TableCell>
                      <TableCell
                        isHeader
                        className="min-w-[18rem] w-[50%] pl-6 pr-5 py-3 text-left font-medium text-theme-xs text-gray-500 sm:pr-6 dark:text-gray-400"
                      >
                        Descrição
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {yieldBundleRows.length > 0 ? (
                      <>
                        <TableRow className="bg-brand-50/35 dark:bg-brand-950/20">
                          <TableCell className="w-[26%] min-w-[11rem] px-5 py-4 pr-8 text-theme-sm sm:px-6">
                            <div className="flex flex-wrap items-start gap-2">
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                                onClick={() => setYieldIngressosExpanded((v) => !v)}
                                aria-expanded={yieldIngressosExpanded}
                                aria-label={
                                  yieldIngressosExpanded
                                    ? "Ocultar cada lançamento de rendimento"
                                    : "Ver cada lançamento de rendimento"
                                }
                              >
                                {yieldIngressosExpanded ? "−" : "+"}
                              </button>
                              <div className="min-w-0">
                                <span className="font-medium text-gray-800 dark:text-white/90">
                                  {yieldBundleRows[0]!.type?.name || "Rendimentos financeiros"}
                                </span>
                                <span className="ml-1.5 font-normal text-gray-500 dark:text-gray-400">
                                  ({yieldBundleRows.length}{" "}
                                  {yieldBundleRows.length === 1 ? "lançamento" : "lançamentos"})
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="w-[11%] min-w-[6.5rem] whitespace-nowrap px-3 py-4 text-right text-theme-sm font-medium text-gray-800 dark:text-white/90">
                            {formatMoneyPtBrCents(yieldBundleTotalCents)}
                          </TableCell>
                          <TableCell className="w-[13%] min-w-[7rem] px-4 py-4 text-theme-sm text-gray-500 sm:px-5 dark:text-gray-400">
                            {yieldUnitLabel}
                          </TableCell>
                          <TableCell className="min-w-[18rem] w-[50%] pl-6 pr-5 py-4 text-theme-sm text-gray-700 sm:pr-6 dark:text-gray-300">
                            <span className="leading-snug">{yieldBundleDescText}</span>
                            <span className="mt-0.5 block text-[11px] leading-tight text-gray-400 tabular-nums dark:text-gray-500">
                              Venc. {yieldDueLabel}
                            </span>
                          </TableCell>
                        </TableRow>
                        {yieldIngressosExpanded
                          ? yieldBundleRows.map((inc) =>
                              renderIncomeDataRow(inc, { detail: true }),
                            )
                          : null}
                      </>
                    ) : null}
                    {singlesRows.map((inc) => renderIncomeDataRow(inc))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </ComponentCard>

        <AddIncomeModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onIncomeAdded={fetchIncomes}
          residentUnits={residentUnits}
          incomeTypes={incomeTypes}
        />
      </div>
    </>
  );
};

export default Incomes;