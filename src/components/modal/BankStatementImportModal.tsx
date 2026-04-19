import React, { useCallback, useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import { API_INCOME_TYPES, parseListResponse } from "../../utils/catalogCache";
import {
  buildPreviewDrafts,
  type CreditDraftLine,
  type CreditKind,
  type DraftLine,
  type OfxIngestResponse,
} from "../../utils/ofxPreviewDrafts";
import { guessExpenseTypeIdForTarMemo } from "../../utils/expenseMemoHeuristics";
import { guessIncomeTypeIdFromMemo } from "../../utils/incomeMemoHeuristics";
import {
  OFX_MATCHING_CONTEXT_PATH,
  parseOfxMatchingContext,
  type OfxMatchingContext,
} from "../../utils/ofxMatchingContext";


const OFX_INGEST_PATH = "/api/v1/bank/ofx-ingest";
const OFX_CONFIRM_PATH = "/api/v1/bank/ofx-confirm";
const LAST_IMPORTED_STATEMENT_PERIOD_KEY = "bank.lastImportedStatementPeriod";

/** Nome da conta contabilística padrão quando o preview não sugere conta (catálogo /api/v1/accounts). */
const DEFAULT_CHART_ACCOUNT_NAME = "Conta Principal";

function normalizeChartAccountLabel(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function resolveDefaultChartAccountId(accounts: CatalogAccount[]): string {
  const target = normalizeChartAccountLabel(DEFAULT_CHART_ACCOUNT_NAME);
  const hit = accounts.find((a) => normalizeChartAccountLabel(a.name) === target);
  return hit?.id ?? "";
}

function format422Body(body: unknown): string {
  if (body === null || body === undefined) return "";
  if (typeof body !== "object") return String(body);
  const o = body as Record<string, unknown>;
  const blocks: string[] = [];
  if (typeof o.message === "string" && o.message.trim()) {
    blocks.push(o.message.trim());
  }
  if ("expected" in o || "received" in o) {
    blocks.push(
      `Esperado: ${JSON.stringify(o.expected, null, 2)}\nRecebido: ${JSON.stringify(o.received, null, 2)}`
    );
  }
  if (Array.isArray(o.violations)) {
    blocks.push(`Violações:\n${JSON.stringify(o.violations, null, 2)}`);
  }
  if (Array.isArray(o.errors)) {
    blocks.push(`Erros:\n${JSON.stringify(o.errors, null, 2)}`);
  }
  if (blocks.length > 0) return blocks.join("\n\n");
  try {
    return JSON.stringify(o, null, 2);
  } catch {
    return "";
  }
}

/** Resumo legível para erros 422 frequentes do ofx-confirm (mensagem técnica continua em errorDetails). */
function summarizeOfx422ForUser(
  message: string,
  matchingCtx: OfxMatchingContext | null
): string {
  const m = message.trim();
  if (!m) return "Validação falhou (422).";
  if (/boleto settlement mismatch/i.test(m)) {
    let out =
      "Desajuste na liquidação de boletos: o total em «Liquidação de boletos» não coincide com o que o servidor calculou como esperado para esse período (campo expected na resposta). " +
      "Esse valor esperado vem da regra e dos dados no back-end — não do formulário do extrato. " +
      "Se há depósitos reais e o esperado aparece como 0, o fluxo desejável seria o sistema aceitar este primeiro fecho como base e seguir em consequência; hoje isso depende de alteração no back-end (bootstrap / primeiro mês / validação prévia). " +
      "Enquanto não existir, para não ficar bloqueado(a) pode alterar temporariamente os créditos afectados de «Liquidação de boletos» para «Outro» (com tipo de ingresso adequado), gravar o restante do extrato e pedir o ajuste da regra de liquidação à equipa técnica.";
    if (matchingCtx?.manualDebitClassificationExpected) {
      out +=
        " O contexto de matching indica instalação sem histórico nem índice semântico (greenfield), situação em que este bloqueio é especialmente penoso em UX.";
    }
    return out;
  }
  return m;
}

/** Campos opcionais do 201 de ofx-confirm (OpenAPI). */
function readOfxConfirmSettlementMeta(body: Record<string, unknown> | null): {
  expectedSlipTotalCents: number | null;
  validatedAgainstSlips: boolean | null;
} {
  if (!body) return { expectedSlipTotalCents: null, validatedAgainstSlips: null };
  const rawExpected =
    body.settlementExpectedSlipTotalCents ?? body.settlement_expected_slip_total_cents;
  let expectedSlipTotalCents: number | null = null;
  if (typeof rawExpected === "number" && Number.isFinite(rawExpected)) {
    expectedSlipTotalCents = rawExpected;
  } else if (typeof rawExpected === "string" && rawExpected.trim() && Number.isFinite(Number(rawExpected))) {
    expectedSlipTotalCents = Number(rawExpected);
  }
  const rawVal =
    body.settlementValidatedAgainstSlips ?? body.settlement_validated_against_slips;
  let validatedAgainstSlips: boolean | null = null;
  if (typeof rawVal === "boolean") validatedAgainstSlips = rawVal;
  else if (rawVal === "true" || rawVal === 1) validatedAgainstSlips = true;
  else if (rawVal === "false" || rawVal === 0) validatedAgainstSlips = false;
  return { expectedSlipTotalCents, validatedAgainstSlips };
}

function formatImportError(status: number, rawBody: string, apiDetail?: string): string {
  const combined = `${apiDetail ?? ""} ${rawBody}`.toLowerCase();
  const routeMissing =
    status === 404 ||
    combined.includes("no route found") ||
    combined.includes("route not found") ||
    /route.*not found/.test(combined);

  if (routeMissing) {
    return (
      "Rota não encontrada na API. Confirme em /api/v1/doc (Bank / OFX): " +
      `${OFX_INGEST_PATH} e ${OFX_CONFIRM_PATH}.`
    );
  }

  const fromApi = apiDetail?.trim() || rawBody.trim();
  if (fromApi.length > 280) {
    return `${fromApi.slice(0, 277)}…`;
  }
  return fromApi || `Erro HTTP ${status}`;
}

function sortCatalogByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
  );
}

function toDateOnly(value: string): string {
  if (!value) return "";
  return value.includes("T") ? value.slice(0, 10) : value.slice(0, 10);
}

function getDominantPeriod(lines: Array<{ postedAt: string }>): string | null {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const normalized = toDateOnly(line.postedAt);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) continue;
    const period = normalized.slice(0, 7);
    counts.set(period, (counts.get(period) ?? 0) + 1);
  }
  let selected: string | null = null;
  let maxCount = 0;
  for (const [period, count] of counts.entries()) {
    if (count > maxCount || (count === maxCount && selected !== null && period > selected)) {
      selected = period;
      maxCount = count;
    } else if (count > maxCount) {
      selected = period;
      maxCount = count;
    }
  }
  return selected;
}

interface CatalogExpenseType {
  id: string;
  name: string;
}

interface CatalogAccount {
  id: string;
  name: string;
}

interface CatalogIncomeType {
  id: string;
  name: string;
}

interface CatalogLoadResult {
  accounts: CatalogAccount[];
  incomeTypes: CatalogIncomeType[];
  expenseTypes: CatalogExpenseType[];
}

function normalizeIncomeTypesPayload(raw: unknown): CatalogIncomeType[] {
  const rows = parseListResponse<Record<string, unknown>>(raw);
  const seen = new Set<string>();
  const out: CatalogIncomeType[] = [];
  for (const row of rows) {
    const id = String(
      row.id ?? row.uuid ?? row.incomeTypeId ?? row.income_type_id ?? ""
    ).trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const label = String(
      row.name ?? row.label ?? row.code ?? row.description ?? row.title ?? ""
    ).trim();
    out.push({ id, name: label || id });
  }
  return out;
}

function normalizeExpenseTypesPayload(raw: unknown): CatalogExpenseType[] {
  const rows = parseListResponse<Record<string, unknown>>(raw);
  const seen = new Set<string>();
  const out: CatalogExpenseType[] = [];
  for (const row of rows) {
    const id = String(
      row.id ?? row.uuid ?? row.expenseTypeId ?? row.expense_type_id ?? ""
    ).trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const label = String(
      row.name ?? row.label ?? row.code ?? row.description ?? row.title ?? ""
    ).trim();
    out.push({ id, name: label || id });
  }
  return out;
}

function normalizeAccountsPayload(raw: unknown): CatalogAccount[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === "object" && Array.isArray((raw as { accounts?: unknown[] }).accounts)) {
    list = (raw as { accounts: unknown[] }).accounts;
  } else {
    list = parseListResponse<unknown>(raw);
  }
  const seen = new Set<string>();
  const out: CatalogAccount[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = String(row.name ?? row.label ?? "").trim() || id;
    out.push({ id, name });
  }
  return out;
}

interface BankStatementImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const BankStatementImportModal: React.FC<BankStatementImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [expenseDrafts, setExpenseDrafts] = useState<DraftLine[]>([]);
  const [creditDrafts, setCreditDrafts] = useState<CreditDraftLine[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<CatalogExpenseType[]>([]);
  const [incomeTypes, setIncomeTypes] = useState<CatalogIncomeType[]>([]);
  const [accounts, setAccounts] = useState<CatalogAccount[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loadingIngest, setLoadingIngest] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [matchingContext, setMatchingContext] = useState<OfxMatchingContext | null>(null);

  const resetAll = useCallback(() => {
    setStep("upload");
    setFile(null);
    setExpenseDrafts([]);
    setCreditDrafts([]);
    setExpenseTypes([]);
    setIncomeTypes([]);
    setAccounts([]);
    setCatalogLoading(false);
    setError(null);
    setErrorDetails(null);
    setInfo(null);
    setLoadingIngest(false);
    setLoadingConfirm(false);
    setMatchingContext(null);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetAll();
    }
  }, [isOpen, resetAll]);

  const loadCatalog = useCallback(async (): Promise<CatalogLoadResult> => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Sessão expirada.");
    setCatalogLoading(true);
    try {
      const [tRes, iRes, aRes] = await Promise.all([
        fetch("/api/v1/expense-types", { headers: { Authorization: `Bearer ${token}` } }),
        fetch(API_INCOME_TYPES, { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/v1/accounts", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!tRes.ok) throw new Error("Não foi possível carregar tipos de despesa.");
      if (!aRes.ok) throw new Error("Não foi possível carregar contas.");
      const typesRaw = await tRes.json();
      const types = normalizeExpenseTypesPayload(typesRaw);
      const accData = await aRes.json();
      const accList = normalizeAccountsPayload(accData);
      setExpenseTypes(types);
      setAccounts(accList);
      let incomeList: CatalogIncomeType[] = [];
      if (iRes.ok) {
        const incRaw = await iRes.json();
        incomeList = normalizeIncomeTypesPayload(incRaw);
        setIncomeTypes(incomeList);
      } else {
        setIncomeTypes([]);
      }
      return { accounts: accList, incomeTypes: incomeList, expenseTypes: types };
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorDetails(null);
    setInfo(null);

    if (!file) {
      setError("Selecione um ficheiro OFX.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Sessão expirada. Entre novamente.");
      return;
    }

    setLoadingIngest(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(OFX_INGEST_PATH, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const text = await res.text();
      let payload: { error?: string; message?: string } & OfxIngestResponse | null = null;
      if (text.trim()) {
        try {
          payload = JSON.parse(text) as { error?: string; message?: string } & OfxIngestResponse;
        } catch {
          
        }
      }

      if (!res.ok) {
        const detail =
          payload?.error ||
          ("message" in (payload ?? {}) ? (payload as { message?: string }).message : undefined);
        throw new Error(formatImportError(res.status, text, detail));
      }

      const data = payload as OfxIngestResponse;
      const { expenseDrafts: nextExpenseDrafts, creditDrafts: nextCreditDrafts } =
        buildPreviewDrafts(data);

      if (nextExpenseDrafts.length === 0 && nextCreditDrafts.length === 0) {
        setInfo(
          "Pré-visualização recebida, mas não há movimentos reconhecidos (débitos nem créditos) com os campos esperados (ex.: fitId, conta, valores)."
        );
        return;
      }

      const bankIds = new Set<string>();
      nextExpenseDrafts.forEach((d) => bankIds.add(d.bankAccountId));
      nextCreditDrafts.forEach((d) => bankIds.add(d.bankAccountId));
      bankIds.delete("");
      if (bankIds.size > 1) {
        setError(
          "O extrato referencia mais do que uma conta bancária interna; confirmação automática não está disponível."
        );
        return;
      }

      const expenseSnap = nextExpenseDrafts;
      const creditSnap = nextCreditDrafts;
      setExpenseDrafts(expenseSnap);
      setCreditDrafts(creditSnap);
      setStep("review");
      setInfo(
        [
          expenseSnap.length > 0 ? `${expenseSnap.length} despesa(s) de débito.` : null,
          creditSnap.length > 0
            ? `${creditSnap.length} crédito(s). Pagamento de boletos: classifique como “Liquidação de boletos”; juros/rendimentos/estornos: “Outro” + tipo de ingresso.`
            : null,
        ]
          .filter(Boolean)
          .join(" ")
      );
      try {
        const [catalogLoad, matchingRes] = await Promise.all([
          loadCatalog(),
          fetch(OFX_MATCHING_CONTEXT_PATH, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (matchingRes.ok) {
          try {
            setMatchingContext(parseOfxMatchingContext(await matchingRes.json()));
          } catch {
            setMatchingContext(null);
          }
        } else {
          setMatchingContext(null);
        }
        const { accounts: accList, incomeTypes: incList, expenseTypes: expList } = catalogLoad;
        const principalId = resolveDefaultChartAccountId(accList);
        if (expenseSnap.length > 0) {
          setExpenseDrafts(
            expenseSnap.map((d) => {
              const accountId = d.accountId.trim() ? d.accountId : principalId || d.accountId;
              let expenseTypeId = d.expenseTypeId;
              if (!expenseTypeId.trim() && expList.length > 0) {
                const tid = guessExpenseTypeIdForTarMemo(d.memo, expList);
                if (tid) expenseTypeId = tid;
              }
              return { ...d, accountId, expenseTypeId };
            })
          );
        }
        if (creditSnap.length > 0 && incList.length > 0) {
          setCreditDrafts(
            creditSnap.map((c) => {
              if (!c.incomeTypeId.trim()) {
                const gid = guessIncomeTypeIdFromMemo(c.memo, incList);
                if (gid) return { ...c, incomeTypeId: gid };
              }
              return c;
            })
          );
        }
      } catch (catErr: unknown) {
        setMatchingContext(null);
        setError(
          catErr instanceof Error ? catErr.message : "Erro ao carregar tipos e contas."
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha no envio.");
    } finally {
      setLoadingIngest(false);
    }
  };

  const updateExpenseDraft = (index: number, patch: Partial<DraftLine>) => {
    setExpenseDrafts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const updateCreditDraft = (index: number, patch: Partial<CreditDraftLine>) => {
    setCreditDrafts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const expenseBlockReady =
    expenseDrafts.length === 0 ||
    (expenseDrafts.every((d) => d.expenseTypeId && d.accountId && d.dueDate) &&
      expenseTypes.length > 0 &&
      accounts.length > 0);

  const needsIncomeTypes = creditDrafts.length > 0;
  const creditBlockReady =
    creditDrafts.length === 0 ||
    (creditDrafts.every(
      (c) =>
        c.creditKind === "boleto_settlement" ||
        (c.creditKind === "other" && Boolean(c.incomeTypeId))
    ) &&
      (!needsIncomeTypes || incomeTypes.length > 0));

  const canConfirm =
    (expenseDrafts.length > 0 || creditDrafts.length > 0) &&
    expenseBlockReady &&
    creditBlockReady &&
    !catalogLoading;

  const handleConfirm = async () => {
    setError(null);
    setErrorDetails(null);
    setInfo(null);

    if (!canConfirm) {
      setError(
        "Preencha os campos obrigatórios: para débitos (tipo, conta, vencimento); para créditos “Outro”, escolha o tipo de ingresso."
      );
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Sessão expirada.");
      return;
    }

    const bankFromExpense = expenseDrafts[0]?.bankAccountId;
    const bankFromCredit = creditDrafts[0]?.bankAccountId;
    const bankAccountId = bankFromExpense || bankFromCredit;
    if (!bankAccountId) {
      setError("Conta bancária interna (bankAccountId) em falta.");
      return;
    }
    const allSameBank =
      expenseDrafts.every((d) => d.bankAccountId === bankAccountId) &&
      creditDrafts.every((d) => d.bankAccountId === bankAccountId);
    if (!allSameBank) {
      setError("Conta bancária interna (bankAccountId) inconsistente entre linhas.");
      return;
    }

    setLoadingConfirm(true);
    try {
      const expenseLines = expenseDrafts.map((d) => {
        const line: Record<string, unknown> = {
          fitId: d.fitId,
          amountInCents: d.amountInCents,
          postedAt: toDateOnly(d.postedAt),
          memo: d.memo,
          expenseTypeId: d.expenseTypeId,
          accountId: d.accountId,
          dueDate: toDateOnly(d.dueDate),
        };
        if (d.description.trim()) line.description = d.description.trim();
        if (d.recurringExpenseId.trim()) line.recurringExpenseId = d.recurringExpenseId.trim();
        if (d.residentUnitId.trim()) line.residentUnitId = d.residentUnitId.trim();
        return line;
      });

      const creditLines = creditDrafts.map((c) => {
        const line: Record<string, unknown> = {
          lineType: "income",
          creditKind: c.creditKind,
          fitId: c.fitId,
          amountInCents: c.amountInCents,
          postedAt: toDateOnly(c.postedAt),
          memo: c.memo,
        };
        if (c.creditKind === "other") {
          line.incomeTypeId = c.incomeTypeId;
        } else if (c.creditKind === "boleto_settlement" && c.incomeTypeId.trim()) {
          line.incomeTypeId = c.incomeTypeId.trim();
        }
        return line;
      });

      const lines = [...expenseLines, ...creditLines];

      const res = await fetch(OFX_CONFIRM_PATH, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bankAccountId, lines }),
      });

      const text = await res.text();
      let body: Record<string, unknown> | null = null;
      if (text.trim()) {
        try {
          body = JSON.parse(text) as Record<string, unknown>;
        } catch {
          
        }
      }

      if (!res.ok) {
        if (res.status === 422 && body && typeof body === "object") {
          const detail = format422Body(body);
          const msg = body.message;
          const raw =
            typeof msg === "string" && msg.trim() ? (msg as string).trim() : "Validação falhou (422).";
          setError(summarizeOfx422ForUser(raw, matchingContext));
          setErrorDetails(detail || text);
        } else {
          const errMsg =
            typeof body?.error === "string"
              ? body.error
              : typeof body?.message === "string"
                ? body.message
                : undefined;
          throw new Error(formatImportError(res.status, text, errMsg));
        }
        return;
      }

      const imported =
        typeof body?.imported === "number" ? body.imported : lines.length;
      const skipped = typeof body?.skipped === "number" ? body.skipped : 0;
      const dominantPeriod = getDominantPeriod([
        ...expenseDrafts,
        ...creditDrafts,
      ]);
      if (dominantPeriod) {
        localStorage.setItem(LAST_IMPORTED_STATEMENT_PERIOD_KEY, dominantPeriod);
      }
      const { expectedSlipTotalCents, validatedAgainstSlips } = readOfxConfirmSettlementMeta(body);
      let infoMsg = `Gravado: ${imported} linha(s). Ignoradas (já importadas): ${skipped}.`;
      if (validatedAgainstSlips === false) {
        const expLabel =
          expectedSlipTotalCents !== null && Number.isFinite(expectedSlipTotalCents)
            ? (expectedSlipTotalCents / 100).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })
            : "R$ 0,00";
        infoMsg +=
          ` Liquidação de boletos: importado sem conciliação com slips no sistema (total esperado em slips: ${expLabel}). ` +
          "Normal no primeiro uso ou quando ainda não há boletos no mês — a reconciliação estrita aplica-se quando existirem dados a casar.";
      } else if (validatedAgainstSlips === true) {
        infoMsg +=
          " Liquidação de boletos validada contra os slips do mês (totais coincidiram).";
      }
      setInfo(infoMsg);
      onSuccess?.();
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err: unknown) {
      setErrorDetails(null);
      setError(err instanceof Error ? err.message : "Falha na confirmação.");
    } finally {
      setLoadingConfirm(false);
    }
  };

  const goBackToUpload = () => {
    setStep("upload");
    setExpenseDrafts([]);
    setCreditDrafts([]);
    setExpenseTypes([]);
    setIncomeTypes([]);
    setAccounts([]);
    setMatchingContext(null);
    setError(null);
    setErrorDetails(null);
    setInfo(null);
  };

  const modalTitle =
    step === "review"
      ? "Confirmar movimentos do extrato OFX"
      : "Importar extrato bancário";
  const widthClass = step === "review" ? "max-w-5xl" : "max-w-lg";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} widthClass={widthClass}>
      {step === "upload" && (
        <form onSubmit={handleIngest} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Passo 1:</strong> envie o ficheiro <strong>OFX</strong>. O servidor devolve uma
            pré-visualização com <strong>débitos (despesas)</strong> e <strong>créditos (ingressos)</strong>.
            No passo 2 confirma o que gravar ({" "}
            <code className="text-xs">ofx-confirm</code> em <code className="text-xs">/api/v1/doc</code>).
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Ficheiro
            </label>
            <input
              type="file"
              accept=".ofx,.qfx,application/x-ofx,text/xml,application/xml"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:text-gray-400 dark:file:bg-brand-500/15 dark:file:text-brand-300"
            />
          </div>
          {error && (
            <div className="space-y-2" role="alert">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              {errorDetails && (
                <pre className="max-h-48 overflow-auto rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900 whitespace-pre-wrap break-words dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
                  {errorDetails}
                </pre>
              )}
            </div>
          )}
          {info && (
            <p className="text-sm text-blue-700 dark:text-blue-300" role="status">
              {info}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loadingIngest}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loadingIngest}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300"
            >
              {loadingIngest ? "A processar…" : "Gerar pré-visualização"}
            </button>
          </div>
        </form>
      )}

      {step === "review" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Passo 2:</strong> confira débitos (despesas) e créditos (ingressos). Créditos de
            liquidação de boletos devem usar <strong>Liquidação de boletos</strong>; juros, rendimentos
            ou estornos: <strong>Outro</strong> e escolha o tipo de ingresso.
          </p>

          {catalogLoading && (
            <p className="text-sm text-gray-500">A carregar tipos, contas e tipos de ingresso…</p>
          )}

          {error && (
            <div className="space-y-2" role="alert">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              {errorDetails && (
                <pre className="max-h-48 overflow-auto rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900 whitespace-pre-wrap break-words dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
                  {errorDetails}
                </pre>
              )}
            </div>
          )}
          {info && (
            <p className="text-sm text-green-600 dark:text-green-400" role="status">
              {info}
            </p>
          )}

          {matchingContext &&
            !catalogLoading &&
            (matchingContext.windowStartDate || matchingContext.windowEndDate) && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Janela de matching (servidor, até{" "}
                {matchingContext.historyWindowMonths ?? 12} meses):{" "}
                <span className="font-mono">
                  {matchingContext.windowStartDate ?? "?"} — {matchingContext.windowEndDate ?? "?"}
                </span>
                . Não usa o mês do calendário da UI como referência.
              </p>
            )}

          {matchingContext && !catalogLoading && matchingContext.manualDebitClassificationExpected && (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-100"
              role="status"
            >
              <strong>Débitos:</strong> neste condomínio não há histórico SQL de memos na janela nem
              índice semântico de despesas — quase toda a classificação de débitos será{" "}
              <strong>revisão manual</strong>. Isto é típico em instalações “greenfield”.
            </div>
          )}

          {matchingContext &&
            !catalogLoading &&
            creditDrafts.length > 0 &&
            matchingContext.creditSqlHistoryAvailable === false && (
              <div
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-100"
                role="status"
              >
                <strong>Créditos:</strong> pouco ou nenhum histórico de ingressos com descrição na
                janela de matching — pode ser necessário rever mais linhas manualmente.
              </div>
            )}

          {!catalogLoading &&
            expenseDrafts.length > 0 &&
            expenseTypes.length === 0 &&
            accounts.length === 0 && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Não foram encontrados tipos de despesa nem contas. Verifique a API ou permissões.
              </p>
            )}

          {!catalogLoading &&
            creditDrafts.length > 0 &&
            needsIncomeTypes &&
            incomeTypes.length === 0 && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Não foram encontrados tipos de ingresso. Verifique a API ou permissões.
              </p>
            )}

          {!catalogLoading &&
            expenseDrafts.length > 0 &&
            (expenseTypes.length > 0 || accounts.length > 0) && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Débitos (despesas)</h4>
              <div className="max-h-[min(40vh,20rem)] overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs dark:divide-gray-700">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/90">
                  <tr>
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-300">Memo</th>
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-300">Valor</th>
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-300">Data</th>
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-300">Tipo</th>
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-300">Conta</th>
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-300">Venc.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {expenseDrafts.map((d, i) => (
                    <tr key={d.fitId} className="align-top">
                      <td className="px-2 py-2 text-gray-800 dark:text-white/90">
                        <div className="flex flex-wrap items-start gap-1">
                          <span className="line-clamp-2 min-w-0 flex-1" title={d.memo}>
                            {d.memo}
                          </span>
                          {d.needsHumanReview ? (
                            <span
                              className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900 dark:bg-amber-500/20 dark:text-amber-200"
                              title="Pré-visualização com status needs_review — confira tipo, conta e valores antes de confirmar."
                            >
                              Revisar
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-gray-800 dark:text-white/90">
                        {(d.amountInCents / 100).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-gray-600 dark:text-gray-400">
                        {d.postedAt}
                      </td>
                      <td className="px-1 py-1">
                        <select
                          value={d.expenseTypeId}
                          onChange={(e) => updateExpenseDraft(i, { expenseTypeId: e.target.value })}
                          className="h-9 w-36 max-w-[10rem] rounded-lg border border-gray-300 bg-white px-1 text-xs dark:border-gray-600 dark:bg-gray-900"
                        >
                          <option value="">— tipo —</option>
                          {sortCatalogByName(expenseTypes).map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <select
                          value={d.accountId}
                          onChange={(e) => updateExpenseDraft(i, { accountId: e.target.value })}
                          className="h-9 w-36 max-w-[10rem] rounded-lg border border-gray-300 bg-white px-1 text-xs dark:border-gray-600 dark:bg-gray-900"
                        >
                          <option value="">— conta —</option>
                          {sortCatalogByName(accounts).map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="date"
                          value={d.dueDate}
                          onChange={(e) => updateExpenseDraft(i, { dueDate: e.target.value })}
                          className="h-9 w-[8.5rem] rounded-lg border border-gray-300 bg-white px-1 text-xs dark:border-gray-600 dark:bg-gray-900"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          )}

          {!catalogLoading && creditDrafts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Créditos (ingressos)</h4>
              <div className="max-h-[min(40vh,20rem)] overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 text-left text-xs dark:divide-gray-700">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/90">
                    <tr>
                      <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-300">Memo</th>
                      <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-300">Valor</th>
                      <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-300">Data</th>
                      <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-300">Classificação</th>
                      <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-300">Tipo de ingresso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {creditDrafts.map((c, i) => (
                      <tr key={c.fitId} className="align-top">
                        <td className="px-2 py-2 text-gray-800 dark:text-white/90">
                          <div className="flex flex-wrap items-start gap-1">
                            <span
                              className="line-clamp-2 min-w-0 flex-1"
                              title={c.classificationHint ?? c.memo}
                            >
                              {c.memo}
                            </span>
                            {c.needsHumanReview ? (
                              <span
                                className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900 dark:bg-amber-500/20 dark:text-amber-200"
                                title="Pré-visualização com status needs_review — confira classificação e tipo de ingresso antes de confirmar."
                              >
                                Revisar
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-gray-800 dark:text-white/90">
                          {(c.amountInCents / 100).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-gray-600 dark:text-gray-400">
                          {c.postedAt}
                        </td>
                        <td className="px-1 py-1">
                          <select
                            value={c.creditKind}
                            onChange={(e) => {
                              const v = e.target.value as CreditKind;
                              if (v === "boleto_settlement") {
                                updateCreditDraft(i, { creditKind: v });
                                return;
                              }
                              const guessed =
                                !c.incomeTypeId.trim() && incomeTypes.length > 0
                                  ? guessIncomeTypeIdFromMemo(c.memo, incomeTypes)
                                  : "";
                              updateCreditDraft(i, {
                                creditKind: v,
                                incomeTypeId: guessed || c.incomeTypeId,
                              });
                            }}
                            className="h-9 max-w-[11rem] rounded-lg border border-gray-300 bg-white px-1 text-xs dark:border-gray-600 dark:bg-gray-900"
                          >
                            <option value="boleto_settlement">Liquidação de boletos</option>
                            <option value="other">Outro (juros/rendimentos/estorno)</option>
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <select
                            value={c.incomeTypeId}
                            onChange={(e) => updateCreditDraft(i, { incomeTypeId: e.target.value })}
                            className="h-9 w-36 max-w-[10rem] rounded-lg border border-gray-300 bg-white px-1 text-xs dark:border-gray-600 dark:bg-gray-900"
                          >
                            <option value="">— tipo —</option>
                            {sortCatalogByName(incomeTypes).map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={goBackToUpload}
              disabled={loadingConfirm}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loadingConfirm}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={!canConfirm || loadingConfirm}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300"
            >
              {loadingConfirm
                ? "A gravar…"
                : `Confirmar (${expenseDrafts.length} débito(s), ${creditDrafts.length} crédito(s))`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default BankStatementImportModal;
