import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PageMeta from '../components/common/PageMeta';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import { Hook } from 'flatpickr/dist/types/options';
import { Modal } from "../components/ui/modal";
import AddGasConsumptionModal from "../components/modal/AddGasConsumptionModal";
import AddAccountModal from "../components/modal/AddAccountModal";
import ConfirmationModal from "../components/modal/ConfirmationModal";
import SlipSettings from "../components/slips/SlipSettings";
import GasConsumptionCard from "../components/gas/GasConsumptionCard";
import GenerateSlipsCard from "../components/slips/GenerateSlipsCard";
import MonthlyExpensesTable from "../components/expenses/MonthlyExpensesTable";
import FullScreenLoader from "../components/common/FullScreenLoader";
import { ExpenseType, ResidentUnit, Account, GasReading } from '../types';
import { parseJsonResponseBody } from '../utils/safeJsonResponse';
import {
  findLatestMonthWithExpenseActivity,
  getDefaultAccountingMonthDate,
} from "../utils/defaultAccountingMonth";
import {
  GAS_BASELINE_REFERENCE_YM_KEY,
  getBaselineReferenceYmFromStorage,
  parseYm,
} from "../utils/gasBaselineReference";
import { parseGasReadingFromUi } from "../utils/gasReadingParser";
import { loadConventionForMonth } from "../utils/condominiumConvention";
import {
  loadMonthBillingParams,
  saveMonthBillingParams,
} from "../utils/billingPolicyService";

type ExplainPayload = {
  targetMonth?: string;
  gasFromEventsCalendarMonth?: string;
  components?: Record<string, unknown>;
  totals?: Record<string, unknown>;
  units?: Array<Record<string, unknown>>;
  warnings?: string[];
  unallocatedLines?: Array<Record<string, unknown>>;
};

type SlipRecord = {
  id: string;
  residentUnitId?: string | null;
  amount?: number | null;
  status?: string | null;
  dueDate?: string | null;
  createdAt?: string | null;
  paidAt?: string | null;
};

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getGasPeriodsForTargetMonth(target: Date): {
  previousReadingYear: number;
  previousReadingMonth: number;
  currentReadingYear: number;
  currentReadingMonth: number;
} {
  const previousReadingDate = new Date(target);
  previousReadingDate.setMonth(previousReadingDate.getMonth() - 1);
  const currentReadingDate = new Date(target);
  return {
    previousReadingYear: previousReadingDate.getFullYear(),
    previousReadingMonth: previousReadingDate.getMonth() + 1,
    currentReadingYear: currentReadingDate.getFullYear(),
    currentReadingMonth: currentReadingDate.getMonth() + 1,
  };
}

/** Formata leitura para a grelha; `null` da API → campo vazio (sem fingir 0 m³). */
function formatGasReadingForUi(value: number | null): string {
  if (value === null) return "";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function parsePtBrM3(raw: string): number | null | "invalid" {
  const t = raw.trim();
  if (t === "") return null;
  const normalized = t.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return "invalid";
  return n;
}

function parsePtBrCurrencyToCents(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const sanitized = t.replace(/[^0-9.,]/g, "");
  if (!sanitized) return null;
  const normalized = sanitized.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function parseRequiredCurrencyToCents(raw: string, label: string): number {
  const parsed = parsePtBrCurrencyToCents(raw);
  if (parsed === null) {
    throw new Error(`Valor inválido em "${label}". Use formato como 250,00.`);
  }
  return parsed;
}

function formatReaisFromCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Total pactuado de «rateio síndico» a repartir (Matisse / partes iguais = R$ 600). Não usar o campo «objetivo síndico» aqui — costuma guardar outros totais da previsão. */
const DEFAULT_SYNDIC_SHARED_TOTAL_CENTS = 60000;

/**
 * Divide `totalCents` inteiro igualmente pelo número de unidades (ordena por `unitLabel` para repartir o resto de forma estável).
 */
function syndicSharedEqualPartsByUnitId(
  totalCents: number,
  unitRows: Array<{ id: string; unitLabel: string }>,
): Record<string, number> {
  const ordered = [...unitRows].sort((a, b) => {
    const c = a.unitLabel.localeCompare(b.unitLabel, "pt-BR");
    return c !== 0 ? c : String(a.id).localeCompare(String(b.id));
  });
  const n = ordered.length;
  if (n <= 0) return {};
  const baseEach = Math.floor(totalCents / n);
  const remainder = totalCents - baseEach * n;
  const byId: Record<string, number> = {};
  ordered.forEach((row, idx) => {
    byId[row.id] = baseEach + (idx < remainder ? 1 : 0);
  });
  return byId;
}

function formatCentsToPtBr(cents: number | null | undefined): string {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return "—";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getFirstNumericValue(source: Record<string, unknown> | undefined, keys: string[]): number | null {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function getNumericBySubstring(source: Record<string, unknown> | undefined, substrings: string[]): number | null {
  if (!source) return null;
  const lowKeys = Object.keys(source);
  for (const sub of substrings) {
    const s = sub.toLowerCase();
    for (const key of lowKeys) {
      if (!key.toLowerCase().includes(s)) continue;
      const value = source[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string") {
        const n = Number(value);
        if (Number.isFinite(n)) return n;
      }
    }
  }
  return null;
}

function getFirstStringValue(source: Record<string, unknown> | undefined, keys: string[]): string | null {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return null;
}

function normalizeUnitToken(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function formatIsoDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("pt-BR");
}

function formatSlipAmount(amount: number | null | undefined): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  return (amount / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function collectUuidCandidates(value: unknown, bucket: Set<string>) {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (typeof value === "string") {
    if (uuidRe.test(value)) bucket.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUuidCandidates(item, bucket);
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (
        typeof v === "string" &&
        uuidRe.test(v) &&
        (k.toLowerCase().includes("id") || k.toLowerCase().includes("slip"))
      ) {
        bucket.add(v);
      } else {
        collectUuidCandidates(v, bucket);
      }
    }
  }
}

/** Unidades sem leitura de gás no mês de referência indicado (contador inicial). */
async function fetchUnitsMissingBaselineGas(
  units: ResidentUnit[],
  token: string,
  year: number,
  month: number,
): Promise<ResidentUnit[]> {
  const headers = { Authorization: `Bearer ${token}` };
  const missing: ResidentUnit[] = [];
  for (const u of units) {
    const res = await fetch(`/api/v1/gas/resident-units/${u.id}/reading/${year}/${month}`, { headers });
    if (res.status === 404) missing.push(u);
  }
  return missing;
}

/**
 * Retrocede desde startYm até encontrar um mês em que todas as unidades já tenham leitura.
 * Evita pedir de novo "contadores iniciais" quando o armazenamento local aponta para um mês
 * diferente do período já gravado no servidor (ex.: leituras em 2025-12 mas picker em 2026-01).
 */
async function findYmWhereAllUnitsHaveReading(
  units: ResidentUnit[],
  token: string,
  startYm: string,
  maxMonthsBack = 48,
): Promise<string | null> {
  if (units.length === 0) return null;
  const parsed = parseYm(startYm);
  if (!parsed) return null;
  let y = parsed.year;
  let m = parsed.month;
  for (let i = 0; i < maxMonthsBack; i++) {
    const missing = await fetchUnitsMissingBaselineGas(units, token, y, m);
    if (missing.length === 0) {
      return `${y}-${String(m).padStart(2, "0")}`;
    }
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return null;
}

async function resolveBaselineGasGate(
  units: ResidentUnit[],
  token: string,
  preferredYm: string,
): Promise<
  | { kind: "complete"; ym: string }
  | { kind: "needsInput"; ym: string; missing: ResidentUnit[] }
> {
  if (units.length === 0) {
    return { kind: "needsInput", ym: preferredYm, missing: [] };
  }
  const completeYm = await findYmWhereAllUnitsHaveReading(units, token, preferredYm);
  if (completeYm) {
    localStorage.setItem(GAS_BASELINE_REFERENCE_YM_KEY, completeYm);
    return { kind: "complete", ym: completeYm };
  }
  const p = parseYm(preferredYm);
  const missing = p ? await fetchUnitsMissingBaselineGas(units, token, p.year, p.month) : [];
  return { kind: "needsInput", ym: preferredYm, missing };
}

const Slips: React.FC = () => {
  const navigate = useNavigate();
  const [targetMonth, setTargetMonth] = useState<Date | null>(() => getDefaultAccountingMonthDate());
  const [catalogReady, setCatalogReady] = useState(false);
  /** Evita recargar gás duplicado quando o mount já carregou o mesmo mês. */
  const lastGasYmRef = useRef<string | null>(null);
  const [paramsLoadedYm, setParamsLoadedYm] = useState<string | null>(null);
  const [policySyncSource, setPolicySyncSource] = useState<"api" | "local" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [residentUnits, setResidentUnits] = useState<ResidentUnit[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);

  const [gasReadings, setGasReadings] = useState<GasReading[]>([]);
  const [isGasModalOpen, setIsGasModalOpen] = useState(false);
  const [selectedGasReading, setSelectedGasReading] = useState<GasReading | null>(null);
  const [isGasPriceModalOpen, setIsGasPriceModalOpen] = useState(false);
  const [gasPriceInput, setGasPriceInput] = useState("");
  const [gasPriceModalError, setGasPriceModalError] = useState<string | null>(null);
  const [savingGasPrice, setSavingGasPrice] = useState(false);

  const [isBaselineGasModalOpen, setIsBaselineGasModalOpen] = useState(false);
  const [unitsNeedingBaselineGas, setUnitsNeedingBaselineGas] = useState<ResidentUnit[]>([]);
  const [baselineGasInput, setBaselineGasInput] = useState<Record<string, string>>({});
  const [baselineGasError, setBaselineGasError] = useState<string | null>(null);
  const [savingBaselineGas, setSavingBaselineGas] = useState(false);
  const [baselinePeriodYm, setBaselinePeriodYm] = useState(() => getBaselineReferenceYmFromStorage());
  const [baselineMissingLoading, setBaselineMissingLoading] = useState(false);

  const [extraFee, setExtraFee] = useState("");
  const [reserveFund, setReserveFund] = useState("");
  const [gasUnitPrice, setGasUnitPrice] = useState("");
  const [syndicTotal, setSyndicTotal] = useState("600,00");

  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationModalContent, setConfirmationModalContent] = useState({ title: '', message: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExplainModalOpen, setIsExplainModalOpen] = useState(false);
  const [isLoadingExplain, setIsLoadingExplain] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [explainData, setExplainData] = useState<ExplainPayload | null>(null);
  const [slipsGenerated, setSlipsGenerated] = useState<SlipRecord[]>([]);
  const [isLoadingSlips, setIsLoadingSlips] = useState(false);
  const [slipsError, setSlipsError] = useState<string | null>(null);
  const [expectedTotalInput, setExpectedTotalInput] = useState("");
  const [expectedGasInput, setExpectedGasInput] = useState("");
  const [expectedSyndicInput, setExpectedSyndicInput] = useState("");
  const [expectedSyndicSharedInput, setExpectedSyndicSharedInput] = useState("600,00");
  const [expectedSyndicIndividualInput, setExpectedSyndicIndividualInput] = useState("");
  const [expectedSyndicIndividualUnit, setExpectedSyndicIndividualUnit] = useState("Apto 401");
  const [expectedExtraInput, setExpectedExtraInput] = useState("");
  const [expectedReserveInput, setExpectedReserveInput] = useState("");
  const [expectedBaseInput, setExpectedBaseInput] = useState("");

  useEffect(() => {
    if (!targetMonth) return;
    let cancelled = false;
    const ym = monthKey(targetMonth);
    setParamsLoadedYm(null);
    setPolicySyncSource(null);

    const cached = loadConventionForMonth(ym);
    setExtraFee(cached.extraFee);
    setReserveFund(cached.reserveFund);
    setSyndicTotal(cached.syndicFee);
    setExpectedSyndicSharedInput(cached.syndicFee.trim() || "600,00");
    if (cached.gasPricePerM3) {
      setGasUnitPrice(cached.gasPricePerM3);
    }

    void loadMonthBillingParams(ym).then((params) => {
      if (cancelled) return;
      setExtraFee(params.extraFee);
      setReserveFund(params.reserveFund);
      setSyndicTotal(params.syndicFee);
      setExpectedSyndicSharedInput(params.syndicFee.trim() || "600,00");
      if (params.gasPricePerM3) {
        setGasUnitPrice(params.gasPricePerM3);
      }
      setPolicySyncSource(params.source);
      setParamsLoadedYm(ym);
    });

    return () => {
      cancelled = true;
    };
  }, [targetMonth]);

  useEffect(() => {
    if (!targetMonth || !paramsLoadedYm) return;
    const ym = monthKey(targetMonth);
    if (ym !== paramsLoadedYm) return;

    const timer = window.setTimeout(() => {
      void saveMonthBillingParams(ym, {
        extraFee,
        reserveFund,
        syndicFee: syndicTotal,
        syndicDistribution: "EQUAL",
        gasPricePerM3: gasUnitPrice,
      }).then(({ syncedToApi }) => {
        setPolicySyncSource(syncedToApi ? "api" : "local");
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [
    targetMonth,
    paramsLoadedYm,
    extraFee,
    reserveFund,
    syndicTotal,
    gasUnitPrice,
  ]);

  const isGenerationDisabled =
    !extraFee ||
    !reserveFund ||
    !gasUnitPrice ||
    gasReadings.some(
      (reading) => !reading.currentReading.trim() || reading.previousReading === null,
    );

  const fetchAccountsOnly = useCallback(async (): Promise<Account[]> => {
    const token = localStorage.getItem("token");
    if (!token) return [];
    const response = await fetch("/api/v1/accounts", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const accountsData = await response.json();
    const list = accountsData.accounts || [];
    setAccounts(list);
    return list;
  }, []);

  
  const fetchSpecificReading = useCallback(
    async (unitId: string, year: number, month: number, token: string): Promise<number | null> => {
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const response = await fetch(`/api/v1/gas/resident-units/${unitId}/reading/${year}/${month}`, {
          headers,
        });
        if (response.ok) {
          const data = (await response.json()) as { reading?: unknown };
          const r = data.reading;
          if (typeof r === "number" && Number.isFinite(r)) return r;
          return null;
        }
        if (response.status === 404) return null;
        console.error(`Error fetching reading for unit ${unitId} in ${month}/${year}:`, response.statusText);
        return null;
      } catch (err) {
        console.error(`Exception fetching reading for unit ${unitId} in ${month}/${year}:`, err);
        return null;
      }
    },
    [],
  );

  const refreshGasReadingsForTargetMonth = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !targetMonth || residentUnits.length === 0) return;
    const tm = targetMonth;
    const {
      previousReadingYear,
      previousReadingMonth,
      currentReadingYear,
      currentReadingMonth,
    } = getGasPeriodsForTargetMonth(tm);
    const readingsPromises = residentUnits.map(async (unit) => {
      const prevReading = await fetchSpecificReading(unit.id, previousReadingYear, previousReadingMonth, token);
      const currReading = await fetchSpecificReading(unit.id, currentReadingYear, currentReadingMonth, token);
      return { prevReading, currReading };
    });
    const allReadingsData = await Promise.all(readingsPromises);
    setGasReadings(
      residentUnits.map((unit, index) => ({
        residentUnitId: unit.id,
        unit: unit.unit,
        previousReading: allReadingsData[index].prevReading,
        currentReading: formatGasReadingForUi(allReadingsData[index].currReading),
      })),
    );
    lastGasYmRef.current = monthKey(tm);
  }, [targetMonth, residentUnits, fetchSpecificReading]);

  /** Carga inicial única: não depende de `targetMonth` para evitar segundo full-screen loader ao sincronizar o mês. */
  useEffect(() => {
    let cancelled = false;
    const fetchInitialData = async () => {
      setLoading(true);
      setCatalogReady(false);
      setPageError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token não encontrado.");
        const headers = { Authorization: `Bearer ${token}` };

        const fromApi = await findLatestMonthWithExpenseActivity(token);
        let resolved: Date;
        if (fromApi) {
          resolved = fromApi;
        } else {
          const wizardYm = peekSlipsWizardReferenceYm();
          if (wizardYm) {
            const [y, m] = wizardYm.split("-").map(Number);
            resolved = new Date(y, m - 1, 1);
            clearSlipsWizardReferenceYm();
          } else {
            resolved = getDefaultAccountingMonthDate();
          }
        }
        const monthToUse = resolved;
        if (!cancelled) {
          setTargetMonth((prev) => {
            if (
              prev &&
              prev.getFullYear() === resolved.getFullYear() &&
              prev.getMonth() === resolved.getMonth()
            ) {
              return prev;
            }
            return new Date(resolved.getFullYear(), resolved.getMonth(), 1);
          });
        }

        const [typesRes, unitsRes, accountsRes, gasPriceRes] = await Promise.all([
          fetch('/api/v1/expense-types', { headers }),
          fetch('/api/v1/resident-unit/actives', { headers }),
          fetch('/api/v1/accounts', { headers }),
          fetch('/api/v1/gas/price', { headers }),
        ]);

        if (cancelled) return;

        let residentsLoaded: ResidentUnit[] = [];
        let accountsLoaded: Account[] = [];

        if (unitsRes.ok) {
          const unitsData: ResidentUnit[] = await unitsRes.json();
          residentsLoaded = unitsData;
          setResidentUnits(unitsData);

          
          const {
            previousReadingYear,
            previousReadingMonth,
            currentReadingYear,
            currentReadingMonth,
          } = getGasPeriodsForTargetMonth(monthToUse);

          const readingsPromises = unitsData.map(async (unit) => {
            const prevReading = await fetchSpecificReading(unit.id, previousReadingYear, previousReadingMonth, token);
            const currReading = await fetchSpecificReading(unit.id, currentReadingYear, currentReadingMonth, token);
            return { prevReading, currReading };
          });
          const allReadingsData = await Promise.all(readingsPromises);

          if (cancelled) return;

          const initialGasReadings: GasReading[] = unitsData.map((unit, index) => ({
            residentUnitId: unit.id,
            unit: unit.unit,
            previousReading: allReadingsData[index].prevReading,
            currentReading: formatGasReadingForUi(allReadingsData[index].currReading),
          }));
          setGasReadings(initialGasReadings);
          lastGasYmRef.current = monthKey(monthToUse);

        } else {
          const errorData = await parseJsonResponseBody<{ message?: string }>(unitsRes);
          throw new Error(errorData?.message || 'Falha ao carregar unidades residenciais.');
        }

        if (typesRes.ok) {
          const expenseTypesData = await typesRes.json();
          setExpenseTypes(expenseTypesData);
        } else {
          console.error('Falha ao carregar tipos de despesa.');
        }

        if (accountsRes.ok) {
          const accountsData = await accountsRes.json();
          const accountsList = accountsData.accounts || [];
          accountsLoaded = accountsList;
          setAccounts(accountsList);
          if (accountsList.length === 0) {
            setPageError("Nenhuma conta contábil encontrada. Cadastre ao menos uma conta para usar Boletos.");
            setIsAddAccountModalOpen(true);
          }
        } else {
          console.error('Falha ao carregar contas.');
        }

        if (gasPriceRes.ok) {
          const monthParams = loadConventionForMonth(monthKey(monthToUse));
          if (monthParams.gasPricePerM3) {
            setGasUnitPrice(monthParams.gasPricePerM3);
            setIsGasPriceModalOpen(false);
          } else {
            const gasPriceData = await gasPriceRes.json();
            const priceInReais = gasPriceData.price_per_m3_in_cents / 100;
            setGasUnitPrice(priceInReais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            setIsGasPriceModalOpen(false);
          }
        } else {
          const errorData = await parseJsonResponseBody<{ message?: string }>(gasPriceRes);
          const originalMessage = errorData?.message || 'Falha ao carregar o preço do gás.';
          const parts = originalMessage.split(':');
          const finalMessage = parts.length > 1 ? parts[parts.length - 1].trim() : originalMessage;
          setPageError(finalMessage);
          if (gasPriceRes.status === 404 || /não foi definido/i.test(finalMessage)) {
            setGasPriceInput("");
            setGasPriceModalError(null);
            setIsGasPriceModalOpen(true);
          }
        }

        if (
          !cancelled &&
          gasPriceRes.ok &&
          residentsLoaded.length > 0 &&
          accountsLoaded.length > 0
        ) {
          const baselineYm = getBaselineReferenceYmFromStorage();
          const gate = await resolveBaselineGasGate(residentsLoaded, token, baselineYm);
          if (!cancelled) setBaselinePeriodYm(gate.ym);
          if (!cancelled && gate.kind === "needsInput" && gate.missing.length > 0) {
            setUnitsNeedingBaselineGas(gate.missing);
            setBaselineGasInput((prev) => {
              const next = { ...prev };
              for (const u of gate.missing) {
                if (next[u.id] === undefined) next[u.id] = "";
              }
              return next;
            });
            setBaselineGasError(null);
            setIsBaselineGasModalOpen(true);
          }
        }

      } catch (err: unknown) {
        console.error("Erro ao carregar dados iniciais:", err);
        if (err instanceof Error) {
          const originalMessage = err.message;
          const parts = originalMessage.split(':');
          const finalMessage = parts.length > 1 ? parts[parts.length - 1].trim() : originalMessage;
          setPageError(finalMessage);
        } else {
          setPageError("Ocorreu um erro desconhecido ao carregar os dados.");
        }
      } finally {
        if (!cancelled) {
          setCatalogReady(true);
          setLoading(false);
        }
      }
    };
    fetchInitialData();
    return () => {
      cancelled = true;
    };
  }, [fetchSpecificReading]);

  /** Ao mudar o mês no picker: atualiza leituras de gás sem overlay de ecrã inteiro. */
  useEffect(() => {
    if (!targetMonth || !catalogReady) return;
    const ym = monthKey(targetMonth);
    if (lastGasYmRef.current === ym) return;
    if (residentUnits.length === 0) return;

    let cancelled = false;
    void (async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      const {
        previousReadingYear,
        previousReadingMonth,
        currentReadingYear,
        currentReadingMonth,
      } = getGasPeriodsForTargetMonth(targetMonth);

      const readingsPromises = residentUnits.map(async (unit) => {
        const prevReading = await fetchSpecificReading(unit.id, previousReadingYear, previousReadingMonth, token);
        const currReading = await fetchSpecificReading(unit.id, currentReadingYear, currentReadingMonth, token);
        return { prevReading, currReading };
      });
      const allReadingsData = await Promise.all(readingsPromises);
      if (cancelled) return;
      setGasReadings(
        residentUnits.map((unit, index) => ({
          residentUnitId: unit.id,
          unit: unit.unit,
          previousReading: allReadingsData[index].prevReading,
          currentReading: formatGasReadingForUi(allReadingsData[index].currReading),
        })),
      );
      lastGasYmRef.current = ym;
    })();

    return () => {
      cancelled = true;
    };
  }, [targetMonth, catalogReady, residentUnits, fetchSpecificReading]);

  useEffect(() => {
    if (!catalogReady || residentUnits.length === 0 || !paramsLoadedYm) return;
    setExpectedSyndicSharedInput(syndicTotal.trim() || "600,00");

    const n = residentUnits.length;
    const extraPer = parsePtBrCurrencyToCents(extraFee);
    const resPer = parsePtBrCurrencyToCents(reserveFund);
    if (typeof extraPer === "number" && n > 0) {
      setExpectedExtraInput(formatReaisFromCents(extraPer * n));
    }
    if (typeof resPer === "number" && n > 0) {
      setExpectedReserveInput(formatReaisFromCents(resPer * n));
    }
  }, [catalogReady, residentUnits, extraFee, reserveFund, syndicTotal, paramsLoadedYm]);

  
  const handleMonthChange: Hook = useCallback((selectedDates) => {
    if (selectedDates.length > 0) setTargetMonth(selectedDates[0]);
  }, []);

  const handleGenerateSlips = async () => {
    setError(null);
    setSuccess(null);
    if (!targetMonth) {
      setError("Por favor, selecione um mês e ano para gerar os boletos.");
      return;
    }
    setIsExplainModalOpen(true);
    await fetchGenerationExplain();
  };

  const fetchGenerationExplain = useCallback(async () => {
    if (!targetMonth) {
      setExplainError("Selecione um mês para executar a análise.");
      return;
    }
    setIsLoadingExplain(true);
    setExplainError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token de autenticação não encontrado.");
      const year = targetMonth.getFullYear();
      const month = targetMonth.getMonth() + 1;
      const formattedMonth = `${year}-${String(month).padStart(2, "0")}`;
      const extraFeeCents = parsePtBrCurrencyToCents(extraFee);
      const reserveFundCents = parsePtBrCurrencyToCents(reserveFund);
      const query = new URLSearchParams({ targetMonth: formattedMonth });
      if (typeof extraFeeCents === "number") {
        // Compatibilidade: alguns backends esperam nomes antigos, outros o contrato "perUnit".
        query.set("extraFee", String(extraFeeCents));
        query.set("extraFeePerUnitCents", String(extraFeeCents));
      }
      if (typeof reserveFundCents === "number") {
        query.set("reserveFund", String(reserveFundCents));
        query.set("reserveFundPerUnitCents", String(reserveFundCents));
      }

      const response = await fetch(`/api/v1/slips/generation/explain?${query.toString()}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errData = await parseJsonResponseBody<{ message?: string }>(response);
        throw new Error(errData?.message || "Falha ao consultar análise sem persistência.");
      }
      const data = (await response.json()) as ExplainPayload;
      console.group("[Slips] explain response (DEBUG — remover depois)");
      console.log("Full payload:", JSON.stringify(data, null, 2));
      if (Array.isArray(data.units) && data.units.length > 0) {
        console.log("units[0] keys:", Object.keys(data.units[0] as object));
        console.log("units[0] sample:", JSON.stringify(data.units[0], null, 2));
      }
      if (data.components) console.log("components keys:", Object.keys(data.components));
      if (data.totals) console.log("totals keys:", Object.keys(data.totals));
      console.groupEnd();
      setExplainData(data);
    } catch (err) {
      setExplainError(err instanceof Error ? err.message : "Falha desconhecida ao consultar análise.");
      setExplainData(null);
    } finally {
      setIsLoadingExplain(false);
    }
  }, [targetMonth, extraFee, reserveFund]);

  const handleOpenExplainModal = () => {
    setIsExplainModalOpen(true);
    void fetchGenerationExplain();
  };

  const fetchSlipDetailsByIds = useCallback(async (ids: string[]) => {
    const token = localStorage.getItem("token");
    if (!token || ids.length === 0) {
      setSlipsGenerated([]);
      return;
    }
    setIsLoadingSlips(true);
    setSlipsError(null);
    try {
      const rows = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/v1/slips/${id}`, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) return { id } as SlipRecord;
          const data = (await res.json()) as Record<string, unknown>;
          const raw = (data.slip && typeof data.slip === "object" ? data.slip : data) as Record<string, unknown>;
          return {
            id: String(raw.id ?? id),
            residentUnitId: (raw.residentUnitId as string) ?? null,
            amount: typeof raw.amount === "number" ? raw.amount : null,
            status: (raw.status as string) ?? null,
            dueDate: (raw.dueDate as string) ?? null,
            createdAt: (raw.createdAt as string) ?? null,
            paidAt: (raw.paidAt as string) ?? null,
          } as SlipRecord;
        }),
      );
      setSlipsGenerated(rows);
    } catch (err) {
      setSlipsError(err instanceof Error ? err.message : "Falha ao carregar boletos gerados.");
      setSlipsGenerated(ids.map((id) => ({ id })));
    } finally {
      setIsLoadingSlips(false);
    }
  }, []);

  const expectedCents = useMemo(
    () => ({
      total: parsePtBrCurrencyToCents(expectedTotalInput),
      gas: parsePtBrCurrencyToCents(expectedGasInput),
      syndic: parsePtBrCurrencyToCents(expectedSyndicInput),
      syndicShared: parsePtBrCurrencyToCents(expectedSyndicSharedInput),
      syndicIndividual: parsePtBrCurrencyToCents(expectedSyndicIndividualInput),
      extra: parsePtBrCurrencyToCents(expectedExtraInput),
      reserve: parsePtBrCurrencyToCents(expectedReserveInput),
      base: parsePtBrCurrencyToCents(expectedBaseInput),
    }),
    [
      expectedTotalInput,
      expectedGasInput,
      expectedSyndicInput,
      expectedSyndicSharedInput,
      expectedSyndicIndividualInput,
      expectedExtraInput,
      expectedReserveInput,
      expectedBaseInput,
    ],
  );

  const explainSummary = useMemo(() => {
    if (!explainData) return null;
    const totals = explainData.totals;
    const components = explainData.components;
    const units = Array.isArray(explainData.units) ? explainData.units : [];

    const normalizedUnits = units.map((unit, index) => {
      const row = unit as Record<string, unknown>;
      const rowTotal =
        getFirstNumericValue(row, ["totalCents", "amountCents", "grandTotalCents"]) ??
        getFirstNumericValue(row, ["total", "amount"]) ??
        0;
      const base =
        getFirstNumericValue(row, ["equalShareCents", "expenseEqualCents", "baseCents", "despesasPrevistasCents"]) ??
        getNumericBySubstring(row, ["equalShare", "base", "despesas"]) ?? 0;
      const syndic =
        getFirstNumericValue(row, ["fractionShareCents", "expenseFractionCents", "syndicCents", "rateioSindicoCents"]) ??
        getNumericBySubstring(row, ["fraction", "syndic", "sindico", "rateio"]) ?? 0;
      const extraFromBackend =
        getFirstNumericValue(row, ["extraFeeApplied", "extraFeeCents", "taxaExtraCents", "recurringEqualCents"]) ??
        getNumericBySubstring(row, ["extraFee", "taxaExtra"]);
      const extra = extraFromBackend ?? 0;

      const reserveFromBackend =
        getFirstNumericValue(row, [
          "reserveFundApplied",
          "reserveFundCents",
          "reserveFundPerUnitCents",
          "reserveFundPerUnitApplied",
          "reserveFundPerUnitAppliedCents",
          "fundoReservaCents",
          "fundoReservaApplied",
          "fundoReservaPerUnitCents",
          "recurringFractionCents",
        ]) ??
        getNumericBySubstring(row, ["reserveFund", "fundoReserva", "reserve"]);
      const reserve = reserveFromBackend ?? 0;

      const gasFromBackend =
        getFirstNumericValue(row, ["gasCents", "gasTotalCents", "gas"]) ??
        getNumericBySubstring(row, ["gas"]);

      const unitId = getFirstStringValue(row, ["residentUnitId", "unitId", "id"]) ?? `unit-${index}`;
      const unitLabel =
        getFirstStringValue(row, ["unit", "residentUnit", "apartment", "unitName"]) ?? `Unidade ${index + 1}`;
      const gasPriceCents = parsePtBrCurrencyToCents(gasUnitPrice);
      const labelToken = normalizeUnitToken(unitLabel);
      const reading = gasReadings.find((r) => {
        if (r.residentUnitId === unitId) return true;
        const readingToken = normalizeUnitToken(r.unit);
        return !!labelToken && !!readingToken && (readingToken.includes(labelToken) || labelToken.includes(readingToken));
      });
      let gasLocal: number | null = null;
      if (typeof gasPriceCents === "number" && reading) {
        const currentReading = parseGasReadingFromUi(reading.currentReading);
        if (typeof currentReading === "number" && reading.previousReading !== null) {
          const consumptionM3 = currentReading - reading.previousReading;
          if (consumptionM3 > 0) {
            gasLocal = Math.round(consumptionM3 * gasPriceCents);
          }
        }
      }
      const gas =
        typeof gasFromBackend === "number" && gasFromBackend > 0
          ? gasFromBackend
          : gasLocal ?? gasFromBackend ?? 0;

      return {
        id: unitId,
        unitLabel,
        idealFraction:
          getFirstNumericValue(row, ["idealFraction", "fraction", "fractionIdeal"]) ??
          getFirstNumericValue(row, ["ideal_fraction"]) ??
          null,
        base,
        syndic,
        extra,
        extraIsLocal: extraFromBackend === null,
        reserve,
        reserveIsLocal: reserveFromBackend === null,
        gas,
        gasIsLocal: !(typeof gasFromBackend === "number" && gasFromBackend > 0),
        total: rowTotal,
      };
    });

    const unitBreakdownTotals = normalizedUnits.reduce(
      (acc, row) => {
        acc.base += row.base;
        acc.syndic += row.syndic;
        acc.extra += row.extra;
        acc.reserve += row.reserve;
        acc.gas += row.gas;
        acc.total += row.total;
        return acc;
      },
      { base: 0, syndic: 0, extra: 0, reserve: 0, gas: 0, total: 0 },
    );

    const totalCents =
      getFirstNumericValue(totals, ["totalCents", "grandTotalCents", "overallTotalCents"]) ??
      unitBreakdownTotals.total;
    const unitsTotalCents = unitBreakdownTotals.total;
    const componentsTotalCents =
      getFirstNumericValue(totals, ["componentsTotalCents"]) ??
      getFirstNumericValue(components, ["expenseGrandTotalCents", "grandTotalCents"]) ??
      unitBreakdownTotals.total;
    const explicitDifference =
      getFirstNumericValue(totals, ["differenceCents", "reconciliationDifferenceCents"]) ??
      (typeof totalCents === "number" ? totalCents - unitsTotalCents : null);

    const backendComponentMap = {
      base:
        getFirstNumericValue(components, ["expenseEqualCents", "equalCents", "despesasPrevistasCents"]) ??
        getNumericBySubstring(components, ["equalShare", "base", "despesas"]),
      syndic:
        getFirstNumericValue(components, ["expenseFractionCents", "fractionCents", "syndicCents"]) ??
        getNumericBySubstring(components, ["fraction", "syndic", "sindico"]),
      extra:
        getFirstNumericValue(components, ["recurringEqualCents", "taxaExtraCents", "extraFeeCents", "extraFeeTotalCents"]) ??
        getNumericBySubstring(components, ["extraFee", "taxaExtra"]),
      reserve:
        getFirstNumericValue(components, [
          "recurringFractionCents",
          "reserveFundCents",
          "reserveFundPerUnitCents",
          "reserveFundTotalCents",
          "fundoReservaCents",
          "fundoReservaTotalCents",
        ]) ??
        getNumericBySubstring(components, ["reserveFund", "fundoReserva", "reserve"]),
      gas:
        getFirstNumericValue(components, ["gasTotalCents", "gasCents"]) ??
        getNumericBySubstring(components, ["gas"]),
    };

    const pickConsistentComponent = (backendValue: number | null, unitValue: number): number => {
      if (typeof backendValue !== "number") return unitValue;
      // Se backend divergir da soma das unidades, prioriza as unidades para não exibir números contraditórios.
      if (Math.abs(backendValue - unitValue) > 1) return unitValue;
      return backendValue;
    };

    const componentMap = {
      base: pickConsistentComponent(backendComponentMap.base, unitBreakdownTotals.base),
      syndic: pickConsistentComponent(backendComponentMap.syndic, unitBreakdownTotals.syndic),
      extra: pickConsistentComponent(backendComponentMap.extra, unitBreakdownTotals.extra),
      reserve: pickConsistentComponent(backendComponentMap.reserve, unitBreakdownTotals.reserve),
      gas: pickConsistentComponent(backendComponentMap.gas, unitBreakdownTotals.gas),
    };

    const missingFromBackend: string[] = [];
    if (normalizedUnits.length > 0) {
      if (normalizedUnits[0].extraIsLocal) missingFromBackend.push("Taxa Extra");
      if (normalizedUnits[0].reserveIsLocal) missingFromBackend.push("Fundo de Reserva");
      if (normalizedUnits[0].gasIsLocal) missingFromBackend.push("Gás");
      if (
        typeof backendComponentMap.extra === "number" &&
        Math.abs(backendComponentMap.extra - unitBreakdownTotals.extra) > 1
      ) {
        missingFromBackend.push("Totais de Taxa Extra inconsistentes");
      }
      if (
        typeof backendComponentMap.reserve === "number" &&
        Math.abs(backendComponentMap.reserve - unitBreakdownTotals.reserve) > 1
      ) {
        missingFromBackend.push("Totais de Fundo de Reserva inconsistentes");
      }
    }

    return {
      totalCents,
      unitsTotalCents: unitBreakdownTotals.total,
      componentsTotalCents,
      explicitDifference,
      componentMap,
      missingFromBackend,
      warnings: explainData.warnings ?? [],
      unallocatedLines: Array.isArray(explainData.unallocatedLines) ? explainData.unallocatedLines : [],
      units: normalizedUnits,
      gasFromEventsCalendarMonth: explainData.gasFromEventsCalendarMonth ?? null,
    };
  }, [explainData, gasUnitPrice, gasReadings]);

  const syndicValidation = useMemo(() => {
    if (!explainSummary) return null;
    const units = explainSummary.units;
    if (!units || units.length === 0) return null;
    const sharedParsed = expectedCents.syndicShared;
    const shared =
      typeof sharedParsed === "number" && sharedParsed > 0
        ? sharedParsed
        : DEFAULT_SYNDIC_SHARED_TOTAL_CENTS;
    const individual = typeof expectedCents.syndicIndividual === "number" ? expectedCents.syndicIndividual : 0;
    const selectedUnit = expectedSyndicIndividualUnit.trim().toLowerCase();
    const equalPartByUnit = syndicSharedEqualPartsByUnitId(shared, units);
    const expectedByUnit: Record<string, number> = {};
    for (const row of units) {
      const rowKey = `${row.unitLabel} ${row.id}`.toLowerCase();
      const bonus = selectedUnit && rowKey.includes(selectedUnit) ? individual : 0;
      expectedByUnit[row.id] = (equalPartByUnit[row.id] ?? Math.floor(shared / units.length)) + bonus;
    }
    const perUnit = units.length > 0 ? shared / units.length : 0;
    const backendSyndicTotal =
      typeof explainSummary.componentMap.syndic === "number"
        ? explainSummary.componentMap.syndic
        : units.reduce((acc, row) => acc + row.syndic, 0);
    const mismatches = units.filter((row) => {
      const expected = expectedByUnit[row.id];
      return Math.abs((row.syndic ?? 0) - expected) > 1;
    });
    const expectedTotal = shared + individual;
    const totalDiff = Math.abs(backendSyndicTotal - expectedTotal);
    const equalRuleDiffersFromBackend = mismatches.length > 0 || totalDiff > 1;
    return {
      enabled: true,
      blocking: false,
      equalRuleDiffersFromBackend,
      backendSyndicTotalCents: backendSyndicTotal,
      perUnit,
      expectedTotal,
      mismatches,
      expectedByUnit,
      totalDiff,
      message: equalRuleDiffersFromBackend
        ? `Informação (é normal se a API só fracionar despesas no JSON): nos totais do explain vem ${formatCentsToPtBr(backendSyndicTotal)} como «síndico». Esta tabela aplica já «partes iguais»: total na coluna = ${formatCentsToPtBr(expectedTotal)}.`
        : "OK: o backend e as partes iguais coincidem no síndico total.",
    };
  }, [
    explainSummary,
    expectedCents.syndicShared,
    expectedCents.syndicIndividual,
    expectedSyndicIndividualUnit,
  ]);

  /**
   * Total da coluna «Rateio síndico» exibível no comparador: com partes iguais coincide com o total definido em `syndicValidation.expectedTotal`.
   * Não usar o agregado `components` quando a API só traz frações (senão aparece tipo R$555 em vez das R$600 aplicadas nas linhas).
   */
  const explainSyndicComparableCents = useMemo((): number | undefined => {
    if (!syndicValidation) return undefined;
    const map = syndicValidation.expectedByUnit ?? {};
    if (Object.keys(map).length === 0) return undefined;
    const t = syndicValidation.expectedTotal;
    return typeof t === "number" && Number.isFinite(t) ? t : undefined;
  }, [syndicValidation]);

  /** Soma da coluna «Crédito» tal como aparece na tabela (≠ soma dos `total` brutos da API quando recompomos síndico/gás no cliente). */
  const explainDisplayedCreditTotal = useMemo(() => {
    if (!explainSummary) return null;
    const useEqualSyndicRecompute = syndicValidation?.enabled === true;

    return explainSummary.units.reduce((sum, row) => {
      if (useEqualSyndicRecompute) {
        const displaySyndic = syndicValidation!.expectedByUnit[row.id] ?? row.syndic;
        return sum + row.base + displaySyndic + row.extra + row.reserve + row.gas;
      }
      return sum + row.total;
    }, 0);
  }, [explainSummary, syndicValidation]);

  const explainQuadraturaDifference = useMemo(() => {
    if (!explainSummary || explainDisplayedCreditTotal === null) return null;
    if (typeof explainSummary.totalCents !== "number") return explainSummary.explicitDifference ?? null;
    return explainSummary.totalCents - explainDisplayedCreditTotal;
  }, [
    explainSummary,
    explainDisplayedCreditTotal,
  ]);

  const aiInsights = useMemo(() => {
    if (!explainSummary) return [];
    const lines: string[] = [];
    const quad =
      typeof explainQuadraturaDifference === "number"
        ? explainQuadraturaDifference
        : explainSummary.explicitDifference;
    if (typeof quad === "number") {
      if (Math.abs(quad) <= 1) {
        lines.push(
          "Quadratura automática OK: o total do backend fecha com a soma da coluna Crédito exibida na tabela.",
        );
      } else {
        lines.push(
          `Atenção: diferença de ${formatCentsToPtBr(quad)} entre total do backend e soma da coluna Crédito (valores visíveis na validação).`,
        );
      }
    }
    const comparePairs: Array<{ key: "total" | "gas" | "syndic" | "extra" | "reserve" | "base"; label: string }> = [
      { key: "total", label: "Total geral" },
      { key: "gas", label: "Gás" },
      { key: "syndic", label: "Síndico/Fração" },
      { key: "extra", label: "Taxa extra" },
      { key: "reserve", label: "Fundo de reserva" },
      { key: "base", label: "Base EQUAL" },
    ];
    const syndicComparable =
      typeof explainSyndicComparableCents === "number"
        ? explainSyndicComparableCents
        : explainSummary.componentMap.syndic;
    const realMap = {
      total: explainSummary.totalCents,
      gas: explainSummary.componentMap.gas,
      syndic: syndicComparable,
      extra: explainSummary.componentMap.extra,
      reserve: explainSummary.componentMap.reserve,
      base: explainSummary.componentMap.base,
    };
    for (const item of comparePairs) {
      const expected = expectedCents[item.key];
      const actual = realMap[item.key];
      if (typeof expected === "number" && typeof actual === "number") {
        const delta = actual - expected;
        if (Math.abs(delta) > 100) {
          lines.push(`${item.label}: diferença de ${formatCentsToPtBr(delta)} vs objetivo informado.`);
        }
      }
    }
    if ((explainSummary.warnings?.length ?? 0) > 0) {
      lines.push("Existem avisos de alocação no backend; revise a seção de avisos/não alocados.");
    }
    if (lines.length === 0) {
      lines.push("Sem divergências óbvias com os dados preenchidos no comparador.");
    }
    return lines;
  }, [expectedCents, explainSummary, explainQuadraturaDifference, explainSyndicComparableCents]);

  const persistedSlipIdsForTargetMonth = useMemo(() => {
    if (!targetMonth) return [];
    const key = `slips.generated.ids.${monthKey(targetMonth)}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      return [];
    }
  }, [targetMonth]);

  useEffect(() => {
    if (persistedSlipIdsForTargetMonth.length > 0) {
      void fetchSlipDetailsByIds(persistedSlipIdsForTargetMonth);
    } else {
      setSlipsGenerated([]);
    }
  }, [persistedSlipIdsForTargetMonth, fetchSlipDetailsByIds]);

  const generateWithAccountingCheck = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token de autenticação não encontrado.");

      const checkTotalResponse = await fetch("/api/v1/slips/check-total", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: 400000 }),
      });

      if (checkTotalResponse.ok) {
        const checkTotalData = await checkTotalResponse.json();
        if (checkTotalData.status === "alert_generated") {
          setConfirmationModalContent({
            title: "Alerta de Contabilidade",
            message: checkTotalData.message,
          });
          setLoading(false);
          setIsConfirmationModalOpen(true);
          return;
        }
      }
      await proceedWithGeneration();
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Ocorreu um erro desconhecido.");
      setLoading(false);
    }
  };

  const proceedWithGeneration = async (force = false) => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    if (!targetMonth) {
      setError("Mês alvo não selecionado.");
      setIsGenerating(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token de autenticação não encontrado.");

      const year = targetMonth.getFullYear();
      const month = targetMonth.getMonth() + 1;
      const formattedMonth = `${year}-${month.toString().padStart(2, '0')}`;

      const extraFeeCents = parseRequiredCurrencyToCents(extraFee, "Taxa Extra");
      const reserveFundCents = parseRequiredCurrencyToCents(reserveFund, "Fundo de Reserva");

      const response = await fetch('/api/v1/slips/generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetMonth: formattedMonth,
          force,
          extraFee: extraFeeCents,
          reserveFund: reserveFundCents,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao gerar os boletos.');
      }

      const generationPayload = await response.json().catch(() => null);
      const idSet = new Set<string>();
      collectUuidCandidates(generationPayload, idSet);
      const generatedIds = [...idSet];
      if (generatedIds.length === 0 || !targetMonth) {
        throw new Error(
          "A geração não retornou IDs de boletos. Operação bloqueada para evitar sucesso sem rastreabilidade.",
        );
      }
      localStorage.setItem(`slips.generated.ids.${monthKey(targetMonth)}`, JSON.stringify(generatedIds));
      await fetchSlipDetailsByIds(generatedIds);

      setSuccess(`Boletos para ${formattedMonth} gerados com sucesso!`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro desconhecido ao gerar os boletos.');
      }
    } finally {
      setIsGenerating(false);
      setIsConfirmationModalOpen(false);
      setLoading(false);
    }
  };

  const handleOpenGasModal = (reading: GasReading) => {
    
    setSelectedGasReading(reading);
    setIsGasModalOpen(true);
  };

  const handleCloseGasModal = () => {
    setIsGasModalOpen(false);
    setSelectedGasReading(null);
  };

  const handleSaveGasConsumption = async (updatedReading: GasReading) => {
    setPageError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token de autenticação não encontrado.");
      if (!targetMonth) throw new Error("Mês alvo não selecionado.");

      const readingDate = new Date(targetMonth);
      const readingYear = readingDate.getFullYear();
      const readingMonth = readingDate.getMonth() + 1; 

      const readingParsed = parseGasReadingFromUi(updatedReading.currentReading);
      if (readingParsed === "invalid" || readingParsed === null || readingParsed <= 0) {
        throw new Error("A leitura atual deve usar formato brasileiro (vírgula decimal) e ser maior que 0.");
      }
      const readingValue = readingParsed;

      const body = {
        id: crypto.randomUUID(),
        residentUnitId: updatedReading.residentUnitId,
        year: readingYear,
        month: readingMonth,
        reading: readingValue,
      };

      const response = await fetch('/api/v1/gas/reading', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao salvar a leitura de gás.');
      }

      
      const unitsData = residentUnits; 

      const {
        previousReadingYear,
        previousReadingMonth,
        currentReadingYear,
        currentReadingMonth,
      } = getGasPeriodsForTargetMonth(targetMonth);

      const readingsPromises = unitsData.map(async unit => {
        const prevReading = await fetchSpecificReading(unit.id, previousReadingYear, previousReadingMonth, token);
        const currReading = await fetchSpecificReading(unit.id, currentReadingYear, currentReadingMonth, token);
        return { prevReading, currReading };
      });
      const allReadingsData = await Promise.all(readingsPromises);

      setGasReadings(unitsData.map((unit, index) => ({
        residentUnitId: unit.id,
        unit: unit.unit,
        previousReading: allReadingsData[index].prevReading,
        currentReading: formatGasReadingForUi(allReadingsData[index].currReading),
      })));

      setSuccess('Consumo de gás salvo com sucesso!');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      console.error("Erro ao salvar consumo de gás:", message);
      setPageError(message);
    }
  };

  const handleSaveGasPrice = async () => {
    setGasPriceModalError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setGasPriceModalError("Token de autenticação não encontrado.");
      return;
    }
    const normalized = gasPriceInput.trim().replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setGasPriceModalError("Informe um valor válido para o preço do m³ (ex.: 26,40).");
      return;
    }
    const cents = Math.round(parsed * 100);
    setSavingGasPrice(true);
    try {
      const res = await fetch("/api/v1/gas/price/direct", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pricePerM3InCents: cents,
          price_per_m3_in_cents: cents,
        }),
      });
      if (!res.ok) {
        const errData = await parseJsonResponseBody<{ message?: string }>(res);
        throw new Error(errData?.message || "Falha ao guardar o preço do gás.");
      }
      setGasUnitPrice(
        (cents / 100).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      );
      setPageError(null);
      setIsGasPriceModalOpen(false);
      setSuccess("Preço do gás definido com sucesso!");
      setTimeout(() => setSuccess(null), 2500);

      const accCheck = await fetch("/api/v1/accounts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!accCheck.ok) return;
      const accPayload = await accCheck.json();
      const accRows = accPayload.accounts || [];
      if (accRows.length === 0) return;

      const unitsActRes = await fetch("/api/v1/resident-unit/actives", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (unitsActRes.ok) {
        const unitsList: ResidentUnit[] = await unitsActRes.json();
        const baselineYm = getBaselineReferenceYmFromStorage();
        const gate = await resolveBaselineGasGate(unitsList, token, baselineYm);
        setBaselinePeriodYm(gate.ym);
        if (gate.kind === "needsInput" && gate.missing.length > 0) {
          setUnitsNeedingBaselineGas(gate.missing);
          setBaselineGasInput((prev) => {
            const next = { ...prev };
            for (const u of gate.missing) {
              if (next[u.id] === undefined) next[u.id] = "";
            }
            return next;
          });
          setBaselineGasError(null);
          setIsBaselineGasModalOpen(true);
        }
      }
    } catch (err) {
      setGasPriceModalError(err instanceof Error ? err.message : "Falha ao guardar o preço do gás.");
    } finally {
      setSavingGasPrice(false);
    }
  };

  const handleDismissBaselineGasModal = () => {
    setIsBaselineGasModalOpen(false);
    setUnitsNeedingBaselineGas([]);
    setBaselineGasInput({});
    setBaselineGasError(null);
    setBaselineMissingLoading(false);
  };

  const handleBaselinePeriodYmChange = useCallback(
    (ym: string) => {
      setBaselinePeriodYm(ym);
      localStorage.setItem(GAS_BASELINE_REFERENCE_YM_KEY, ym);
      const parsed = parseYm(ym);
      const token = localStorage.getItem("token");
      if (!parsed || !token || residentUnits.length === 0) {
        setUnitsNeedingBaselineGas([]);
        return;
      }
      setBaselineMissingLoading(true);
      setBaselineGasError(null);
      void (async () => {
        try {
          const missing = await fetchUnitsMissingBaselineGas(residentUnits, token, parsed.year, parsed.month);
          setUnitsNeedingBaselineGas(missing);
          setBaselineGasInput((prev) => {
            const next = { ...prev };
            for (const u of missing) {
              if (next[u.id] === undefined) next[u.id] = "";
            }
            return next;
          });
        } catch {
          setBaselineGasError("Não foi possível verificar as leituras em falta para esse mês.");
        } finally {
          setBaselineMissingLoading(false);
        }
      })();
    },
    [residentUnits],
  );

  const handleSaveBaselineGasReadings = async () => {
    setBaselineGasError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setBaselineGasError("Token de autenticação não encontrado.");
      return;
    }
    const period = parseYm(baselinePeriodYm);
    if (!period) {
      setBaselineGasError("Selecione um mês de referência válido.");
      return;
    }
    const readingYear = period.year;
    const readingMonth = period.month;
    for (const u of unitsNeedingBaselineGas) {
      const p = parsePtBrM3(baselineGasInput[u.id] ?? "");
      if (p === "invalid" || p === null) {
        setBaselineGasError(`Indique um contador inicial válido (m³, ≥ 0) para "${u.unit}".`);
        return;
      }
    }
    setSavingBaselineGas(true);
    try {
      for (const u of unitsNeedingBaselineGas) {
        const reading = parsePtBrM3(baselineGasInput[u.id] ?? "") as number;
        const response = await fetch("/api/v1/gas/reading", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            id: crypto.randomUUID(),
            residentUnitId: u.id,
            year: readingYear,
            month: readingMonth,
            reading,
          }),
        });
        if (!response.ok) {
          const errData = await parseJsonResponseBody<{ message?: string }>(response);
          throw new Error(errData?.message || `Falha ao gravar contador de gás para ${u.unit}.`);
        }
      }
      localStorage.setItem(GAS_BASELINE_REFERENCE_YM_KEY, baselinePeriodYm);
      handleDismissBaselineGasModal();
      setSuccess("Contadores iniciais de gás guardados com sucesso.");
      setTimeout(() => setSuccess(null), 2500);
      await refreshGasReadingsForTargetMonth();
    } catch (e) {
      setBaselineGasError(e instanceof Error ? e.message : "Falha ao guardar.");
    } finally {
      setSavingBaselineGas(false);
    }
  };

  const baselineHumanLabel = useMemo(() => {
    const p = parseYm(baselinePeriodYm);
    if (!p) return baselinePeriodYm;
    return new Date(p.year, p.month - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  }, [baselinePeriodYm]);

  const targetMonthLabel = useMemo(() => {
    if (!targetMonth) return "—";
    return targetMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [targetMonth]);

  const gasMonthMappingLabel = useMemo(() => {
    if (!targetMonth) return null;
    const {
      previousReadingYear,
      previousReadingMonth,
      currentReadingYear,
      currentReadingMonth,
    } = getGasPeriodsForTargetMonth(targetMonth);
    const billingLabel = targetMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    const currentPeriodLabel = `${String(currentReadingMonth).padStart(2, "0")}/${currentReadingYear}`;
    const previousPeriodLabel = `${String(previousReadingMonth).padStart(2, "0")}/${previousReadingYear}`;
    return `Boletos: ${billingLabel}. Gás: consumo = leitura ${currentPeriodLabel} − leitura ${previousPeriodLabel}.`;
  }, [targetMonth]);

  const gasTablePeriodLabels = useMemo(() => {
    if (!targetMonth) return { previous: "", current: "" };
    const p = getGasPeriodsForTargetMonth(targetMonth);
    return {
      previous: `${String(p.previousReadingMonth).padStart(2, "0")}/${p.previousReadingYear}`,
      current: `${String(p.currentReadingMonth).padStart(2, "0")}/${p.currentReadingYear}`,
    };
  }, [targetMonth]);

  return (
    <>
      <FullScreenLoader isOpen={loading && !isConfirmationModalOpen} />
      <PageMeta title="Boletos | Matisse" description="Página para geração e gestão de boletos" />
      <PageBreadcrumb pageTitle="Boletos" />

      {pageError && (
        <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
          <span className="font-medium">Erro!</span> {pageError}
        </div>
      )}

      {success && (
        <div className="p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400" role="alert">
          <span className="font-medium">Sucesso!</span> {success}
        </div>
      )}


      {!loading && (
        <div className="space-y-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Introduza as leituras de gás e os parâmetros do mês (taxa extra, fundo, síndico e preço do gás)
            antes de gerar boletos. Cada mês guarda os seus valores no servidor; meses sem alteração herdam o último definido.
            {policySyncSource === "local" && (
              <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">
                Parâmetros apenas em cache local — o backend ainda não expõe{" "}
                <code className="text-xs">/billing-policy</code>.
              </span>
            )}
          </p>
          {gasMonthMappingLabel && (
            <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:border-brand-800/60 dark:bg-brand-950/30 dark:text-brand-200">
              {gasMonthMappingLabel}
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleOpenExplainModal}
              className="inline-flex items-center justify-center rounded-lg border border-brand-300 bg-brand-50 px-4 py-2 text-sm text-brand-800 hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-950/40 dark:text-brand-200 dark:hover:bg-brand-900/50"
            >
              Validar cálculo sem persistir
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <GenerateSlipsCard
              targetMonth={targetMonth}
              onMonthChange={handleMonthChange}
              onGenerate={handleGenerateSlips}
              loading={isGenerating}
              error={error}
              success={success}
              className="lg:col-span-3 h-full"
              isGenerationDisabled={isGenerationDisabled || !!pageError || accounts.length === 0}
            />
            <div className="lg:col-span-3 h-full">
              <SlipSettings
                targetMonthLabel={targetMonthLabel}
                extraFee={extraFee}
                setExtraFee={setExtraFee}
                reserveFund={reserveFund}
                setReserveFund={setReserveFund}
                gasUnitPrice={gasUnitPrice}
                setGasUnitPrice={setGasUnitPrice}
                syndicTotal={syndicTotal}
                setSyndicTotal={setSyndicTotal}
              />
            </div>
            <GasConsumptionCard
              residentUnits={residentUnits}
              gasReadings={gasReadings}
              gasUnitPrice={gasUnitPrice}
              onOpenGasModal={handleOpenGasModal}
              previousPeriodLabel={gasTablePeriodLabels.previous}
              currentPeriodLabel={gasTablePeriodLabels.current}
              className="lg:col-span-6 h-full"
            />
          </div>

          <MonthlyExpensesTable
            targetMonth={targetMonth}
            expenseTypes={expenseTypes}
            residentUnits={residentUnits}
            accounts={accounts}
          />
        </div>
      )}

      <AddGasConsumptionModal
        isOpen={isGasModalOpen}
        onClose={handleCloseGasModal}
        gasReading={selectedGasReading}
        gasUnitPrice={gasUnitPrice}
        onSave={handleSaveGasConsumption}
      />

      <Modal
        isOpen={isBaselineGasModalOpen}
        onClose={handleDismissBaselineGasModal}
        title="Contadores iniciais de gás"
        widthClass="max-w-lg"
        showCloseButton={false}
        closeOnBackdropClick={false}
        closeOnEscape={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Escolha o <strong className="text-gray-800 dark:text-white/90">mês de referência</strong>. Cada valor é a
            leitura do contador nesse mês. Só aparecem unidades sem registo nesse período. Pode gravar aqui, fechar sem
            gravar ou ir a <strong className="text-gray-800 dark:text-white/90">Unidades residenciais</strong>.
          </p>
          <div>
            <label
              htmlFor="baseline-gas-period-ym"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Mês de referência do contador
            </label>
            <input
              id="baseline-gas-period-ym"
              type="month"
              value={baselinePeriodYm}
              onChange={(e) => {
                const v = e.target.value;
                if (v) handleBaselinePeriodYmChange(v);
              }}
              className="h-10 w-full max-w-[200px] rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              disabled={savingBaselineGas}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Período selecionado:{" "}
              <strong className="text-gray-700 dark:text-gray-200">{baselineHumanLabel}</strong>
              {baselineMissingLoading ? " — a atualizar a lista…" : null}
            </p>
          </div>
          {unitsNeedingBaselineGas.length === 0 && !baselineMissingLoading ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Nenhuma unidade carece de leitura neste mês. Escolha outro mês se pretender registar ou corrigir doutro
              período.
            </p>
          ) : null}
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {unitsNeedingBaselineGas.map((u) => (
              <div key={u.id} className="grid grid-cols-[1fr_120px] items-center gap-3">
                <span className="text-sm text-gray-700 dark:text-gray-200">{u.unit}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={baselineGasInput[u.id] ?? ""}
                  onChange={(e) =>
                    setBaselineGasInput((prev) => ({ ...prev, [u.id]: e.target.value }))
                  }
                  placeholder="m³"
                  className="h-10 rounded-lg border border-gray-300 px-3 text-right text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  disabled={savingBaselineGas}
                />
              </div>
            ))}
          </div>
          {baselineGasError && (
            <p className="text-sm text-red-600 dark:text-red-400">{baselineGasError}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <strong className="font-medium text-gray-600 dark:text-gray-300">Fechar sem guardar:</strong> sai deste
            assistente sem gravar; as unidades continuam sem leitura neste mês.{" "}
            <strong className="font-medium text-gray-600 dark:text-gray-300">Não definir aqui:</strong> fecha e abre
            &quot;Unidades residenciais&quot; para registar o contador no formulário de cada unidade.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={handleDismissBaselineGasModal}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              disabled={savingBaselineGas}
            >
              Fechar sem guardar
            </button>
            <button
              type="button"
              onClick={() => {
                handleDismissBaselineGasModal();
                navigate("/unidades-residenciais");
              }}
              className="inline-flex items-center justify-center rounded-lg border border-brand-300 bg-brand-50 px-4 py-2 text-sm text-brand-800 hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-950/40 dark:text-brand-200 dark:hover:bg-brand-900/50"
              disabled={savingBaselineGas}
            >
              Não definir aqui — abrir Unidades residenciais
            </button>
            <button
              type="button"
              onClick={() => void handleSaveBaselineGasReadings()}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600 disabled:opacity-50"
              disabled={
                savingBaselineGas ||
                baselineMissingLoading ||
                unitsNeedingBaselineGas.length === 0
              }
            >
              {savingBaselineGas ? "Guardando..." : "Guardar contadores"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isGasPriceModalOpen}
        onClose={() => setIsGasPriceModalOpen(false)}
        title="Definir preço do gás"
        widthClass="max-w-md"
        showCloseButton={false}
        closeOnBackdropClick={false}
        closeOnEscape={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            O preço do gás ainda não está definido. Informe o valor por m³ para habilitar a geração de boletos.
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Preço do m³ (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={gasPriceInput}
              onChange={(e) => setGasPriceInput(e.target.value)}
              placeholder="Ex.: 26,40"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              disabled={savingGasPrice}
            />
          </div>
          {gasPriceModalError && (
            <p className="text-sm text-red-600 dark:text-red-400">{gasPriceModalError}</p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsGasPriceModalOpen(false)}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              disabled={savingGasPrice}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveGasPrice}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600 disabled:opacity-50"
              disabled={savingGasPrice}
            >
              {savingGasPrice ? "Guardando..." : "Guardar preço"}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => {
          setIsConfirmationModalOpen(false);
          setLoading(false);
        }}
        onConfirm={() => proceedWithGeneration(true)}
        title={confirmationModalContent.title}
        message={confirmationModalContent.message}
        confirmText="Gerar Mesmo Assim"
        cancelText="Cancelar"
        isLoading={isGenerating}
      />

      <Modal
        isOpen={isExplainModalOpen}
        onClose={() => setIsExplainModalOpen(false)}
        title="Validação de geração (sem persistir)"
        widthClass="max-w-4xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Esta análise não grava boletos. Use para validar quadratura, identificar linhas não alocadas e comparar com
            o demonstrativo antes de gerar.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void fetchGenerationExplain()}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600 disabled:opacity-50"
              disabled={isLoadingExplain}
            >
              {isLoadingExplain ? "Analisando..." : "Atualizar análise"}
            </button>
            <button
              type="button"
              onClick={() => void generateWithAccountingCheck()}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
              disabled={isLoadingExplain || isGenerating || syndicValidation?.blocking === true}
            >
              {isGenerating ? "Gerando..." : "Gerar boletos agora"}
            </button>
            {explainSummary?.gasFromEventsCalendarMonth && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Gás carregado do calendário: {explainSummary.gasFromEventsCalendarMonth}
              </span>
            )}
          </div>
          {explainError && (
            <p className="text-sm text-red-600 dark:text-red-400">{explainError}</p>
          )}
          {explainSummary && (
            <div className="space-y-4">
              {explainSummary.missingFromBackend.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
                  <p className="font-medium">Componentes não retornados pelo backend:</p>
                  <p>{explainSummary.missingFromBackend.join(", ")}</p>
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    Os valores marcados com * na tabela não vieram no payload de <code>explain</code> por unidade; quando dá para
                    calcular neste cliente (ex.: consumo × preço do gás ou taxas/fixos que você informou nos campos de geração), eles aparecem
                    preenchidos — o * indica apenas que{" "}
                    <strong className="font-medium">não são totais garantidos pela API.</strong>
                    Para fechar só com servidor, o backend deve devolver esses componentes por unidade e nos totais.
                  </p>
                </div>
              )}
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <tr>
                      <th className="px-3 py-2 text-left">Apto.</th>
                      <th className="px-3 py-2 text-right">Fração ideal</th>
                      <th className="px-3 py-2 text-right">Despesas previstas</th>
                      <th className="px-3 py-2 text-right">Rateio Síndico</th>
                      <th className="px-3 py-2 text-right">Taxa extra</th>
                      <th className="px-3 py-2 text-right">Fundo reserva</th>
                      <th className="px-3 py-2 text-right">Gás</th>
                      <th className="px-3 py-2 text-right">Crédito</th>
                    </tr>
                  </thead>
                  <tbody>
                    {explainSummary.units.map((row) => (
                      (() => {
                        const displaySyndic =
                          syndicValidation?.enabled
                            ? (syndicValidation.expectedByUnit[row.id] ?? row.syndic)
                            : row.syndic;
                        const displayCredit =
                          syndicValidation?.enabled
                            ? row.base + displaySyndic + row.extra + row.reserve + row.gas
                            : row.total;
                        return (
                      <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-3 py-2 text-left">{row.unitLabel}</td>
                        <td className="px-3 py-2 text-right">
                          {typeof row.idealFraction === "number"
                            ? row.idealFraction.toLocaleString("pt-BR", { minimumFractionDigits: 6, maximumFractionDigits: 7 })
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">{formatCentsToPtBr(row.base)}</td>
                        <td className="px-3 py-2 text-right">
                          {formatCentsToPtBr(displaySyndic)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatCentsToPtBr(row.extra)}
                          {row.extraIsLocal && <span className="ml-0.5 text-amber-600 dark:text-amber-400" title="Componente ausente no payload do backend">*</span>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatCentsToPtBr(row.reserve)}
                          {row.reserveIsLocal && <span className="ml-0.5 text-amber-600 dark:text-amber-400" title="Componente ausente no payload do backend">*</span>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatCentsToPtBr(row.gas)}
                          {row.gasIsLocal && <span className="ml-0.5 text-amber-600 dark:text-amber-400" title="Componente ausente no payload do backend">*</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{formatCentsToPtBr(displayCredit)}</td>
                      </tr>
                        );
                      })()
                    ))}
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold dark:border-gray-600 dark:bg-gray-800/70">
                      <td className="px-3 py-2 text-left">Total</td>
                      <td className="px-3 py-2 text-right">100,00%</td>
                      <td className="px-3 py-2 text-right">{formatCentsToPtBr(explainSummary.componentMap.base)}</td>
                      <td className="px-3 py-2 text-right">
                        {formatCentsToPtBr(
                          syndicValidation?.enabled
                            ? syndicValidation.expectedTotal
                            : explainSummary.componentMap.syndic,
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">{formatCentsToPtBr(explainSummary.componentMap.extra)}</td>
                      <td className="px-3 py-2 text-right">{formatCentsToPtBr(explainSummary.componentMap.reserve)}</td>
                      <td className="px-3 py-2 text-right">{formatCentsToPtBr(explainSummary.componentMap.gas)}</td>
                      <td className="px-3 py-2 text-right">
                        {formatCentsToPtBr(
                          typeof explainDisplayedCreditTotal === "number"
                            ? explainDisplayedCreditTotal
                            : explainSummary.unitsTotalCents,
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total backend</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{formatCentsToPtBr(explainSummary.totalCents)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Soma por unidades</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {formatCentsToPtBr(
                      typeof explainDisplayedCreditTotal === "number"
                        ? explainDisplayedCreditTotal
                        : explainSummary.unitsTotalCents,
                    )}
                  </p>
                  {typeof explainDisplayedCreditTotal === "number" &&
                    Math.abs(explainDisplayedCreditTotal - explainSummary.unitsTotalCents) > 1 ? (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        A soma dos <code className="text-[11px]">total</code> na resposta foi{" "}
                        {formatCentsToPtBr(explainSummary.unitsTotalCents)}; o número acima é o da coluna Crédito
                        (consistente com a regra síndico e componentes que recompôs no cliente).
                      </p>
                    ) : null}
                </div>
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Diferença de quadratura</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {formatCentsToPtBr(
                      typeof explainQuadraturaDifference === "number"
                        ? explainQuadraturaDifference
                        : explainSummary.explicitDifference,
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="mb-2 text-sm font-medium text-gray-800 dark:text-white/90">
                  Comparação direta com o demonstrativo (objetivo x cálculo)
                </p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3 mb-3">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={expectedTotalInput}
                    onChange={(e) => setExpectedTotalInput(e.target.value)}
                    placeholder="Objetivo total (R$)"
                    className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={expectedBaseInput}
                    onChange={(e) => setExpectedBaseInput(e.target.value)}
                    placeholder="Objetivo base/despesas (R$)"
                    className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={expectedSyndicInput}
                    onChange={(e) => setExpectedSyndicInput(e.target.value)}
                    placeholder="Objetivo p/ comparar só coluna síndico (≠ as 600 de partes iguais)"
                    className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={expectedSyndicSharedInput}
                    onChange={(e) => setExpectedSyndicSharedInput(e.target.value)}
                    placeholder="Total rateio síndico dividido igual (padrão 600,00)"
                    className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={expectedSyndicIndividualInput}
                    onChange={(e) => setExpectedSyndicIndividualInput(e.target.value)}
                    placeholder="Ajuste individual síndico (R$)"
                    className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                  <input
                    type="text"
                    value={expectedSyndicIndividualUnit}
                    onChange={(e) => setExpectedSyndicIndividualUnit(e.target.value)}
                    placeholder="Unidade do ajuste (ex.: Apto 401)"
                    className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={expectedExtraInput}
                    onChange={(e) => setExpectedExtraInput(e.target.value)}
                    placeholder="Objetivo taxa extra (R$)"
                    className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={expectedReserveInput}
                    onChange={(e) => setExpectedReserveInput(e.target.value)}
                    placeholder="Objetivo fundo reserva (R$)"
                    className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={expectedGasInput}
                    onChange={(e) => setExpectedGasInput(e.target.value)}
                    placeholder="Objetivo gás (R$)"
                    className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>
                {syndicValidation && (
                  <div
                    className={`mb-3 rounded-md p-3 text-sm ${
                      syndicValidation.blocking
                        ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        : syndicValidation.equalRuleDiffersFromBackend
                          ? "bg-sky-50 text-sky-900 dark:bg-sky-950/35 dark:text-sky-100/95"
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    }`}
                  >
                    <p className="font-medium">{syndicValidation.message}</p>
                    {syndicValidation.enabled && (
                      <p>
                        Compartilhado por unidade: {formatCentsToPtBr(Math.round(syndicValidation.perUnit))} | Total esperado
                        coluna síndico: {formatCentsToPtBr(syndicValidation.expectedTotal)}
                      </p>
                    )}
                    {syndicValidation.blocking && syndicValidation.mismatches.length > 0 && (
                      <p>
                        Unidades fora da regra:{" "}
                        {syndicValidation.mismatches
                          .slice(0, 5)
                          .map((row) => row.unitLabel)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                )}
                <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      <tr>
                        <th className="px-3 py-2 text-left">Componente</th>
                        <th className="px-3 py-2 text-right">Objetivo</th>
                        <th className="px-3 py-2 text-right">Calculado</th>
                        <th className="px-3 py-2 text-right">Diferença</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "Total", expected: expectedCents.total, actual: explainSummary.totalCents },
                        { label: "Despesas previstas", expected: expectedCents.base, actual: explainSummary.componentMap.base },
                        {
                          label: "Rateio Síndico",
                          expected: expectedCents.syndic,
                          actual:
                            typeof explainSyndicComparableCents === "number"
                              ? explainSyndicComparableCents
                              : explainSummary.componentMap.syndic,
                        },
                        { label: "Taxa extra", expected: expectedCents.extra, actual: explainSummary.componentMap.extra },
                        { label: "Fundo reserva", expected: expectedCents.reserve, actual: explainSummary.componentMap.reserve },
                        { label: "Gás", expected: expectedCents.gas, actual: explainSummary.componentMap.gas },
                      ].map((row) => {
                        const delta =
                          typeof row.expected === "number" && typeof row.actual === "number"
                            ? row.actual - row.expected
                            : null;
                        return (
                          <tr key={row.label} className="border-t border-gray-100 dark:border-gray-800">
                            <td className="px-3 py-2">{row.label}</td>
                            <td className="px-3 py-2 text-right">{formatCentsToPtBr(row.expected)}</td>
                            <td className="px-3 py-2 text-right">{formatCentsToPtBr(row.actual)}</td>
                            <td className="px-3 py-2 text-right">{formatCentsToPtBr(delta)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  {aiInsights.map((line) => (
                    <p key={line}>• {line}</p>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="mb-2 text-sm font-medium text-gray-800 dark:text-white/90">Ponto 4 explicado: avisos e não alocados</p>
                {(explainSummary.warnings.length > 0 || explainSummary.unallocatedLines.length > 0) ? (
                  <>
                    {explainSummary.warnings.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-300">Warnings</p>
                        {explainSummary.warnings.map((warning) => (
                          <p key={warning} className="text-sm text-amber-800 dark:text-amber-200">• {warning}</p>
                        ))}
                      </div>
                    )}
                    {explainSummary.unallocatedLines.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase text-red-700 dark:text-red-300">Linhas não alocadas</p>
                        {explainSummary.unallocatedLines.slice(0, 8).map((line, index) => (
                          <p key={index} className="text-sm text-red-800 dark:text-red-200">
                            • {JSON.stringify(line)}
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Nenhum aviso e nenhuma linha não alocada. Isso significa que o backend conseguiu imputar tudo em unidades/componentes.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {!loading && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">
            Boletos gerados (mês selecionado)
          </h3>
          {isLoadingSlips ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">Carregando boletos...</p>
          ) : slipsGenerated.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Nenhum boleto listado ainda para este mês no frontend.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Unidade</th>
                    <th className="px-3 py-2">Valor</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Vencimento</th>
                    <th className="px-3 py-2">Pago em</th>
                  </tr>
                </thead>
                <tbody>
                  {slipsGenerated.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-3 py-2 font-mono text-xs">{row.id}</td>
                      <td className="px-3 py-2">{row.residentUnitId ?? "—"}</td>
                      <td className="px-3 py-2">{formatSlipAmount(row.amount)}</td>
                      <td className="px-3 py-2">{row.status ?? "—"}</td>
                      <td className="px-3 py-2">{formatIsoDate(row.dueDate)}</td>
                      <td className="px-3 py-2">{formatIsoDate(row.paidAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {slipsError && (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{slipsError}</p>
          )}
        </div>
      )}

      <AddAccountModal
        isOpen={isAddAccountModalOpen}
        onClose={() => setIsAddAccountModalOpen(false)}
        showCloseButton={false}
        closeOnBackdropClick={false}
        closeOnEscape={false}
        onAccountAdded={async () => {
          const list = await fetchAccountsOnly();
          if (list.length > 0) {
            setPageError((prev) =>
              prev?.includes("Nenhuma conta contábil encontrada") ? null : prev
            );
            setIsAddAccountModalOpen(false);
          }
        }}
      />
    </>
  );
};

export default Slips;
