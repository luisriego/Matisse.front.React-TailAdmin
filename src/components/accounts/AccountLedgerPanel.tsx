import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DataTable, { ColumnDef } from "../tables/DataTable";
import {
  AccountLedgerRow,
  buildAccountLedger,
  mergeLedgerExpenseSources,
  parseLedgerSourceList,
} from "../../utils/buildAccountLedger";
import { formatDateDMY } from "../../utils/dateFormat";

async function parseJsonFlexible<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function formatBrlFromCents(cents: number): string {
  if (!Number.isFinite(cents)) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface AccountLedgerPanelProps {
  accountId: string;
  accountName: string;
  /** Saldo já vindo da lista de contas (mostrado enquanto o /balance carrega). */
  balanceHintCents: number;
  onClose: () => void;
}

export default function AccountLedgerPanel({
  accountId,
  accountName,
  balanceHintCents,
  onClose,
}: AccountLedgerPanelProps) {
  const [rows, setRows] = useState<AccountLedgerRow[]>([]);
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expensesGlobalOk, setExpensesGlobalOk] = useState<boolean | null>(null);
  const [incomesOk, setIncomesOk] = useState<boolean | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const { signal } = ac;

    setLoading(true);
    setError(null);
    setExpensesGlobalOk(null);
    setIncomesOk(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Não tenho token de sessão — não consigo pedir dados ao servidor.");
      setLoading(false);
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const now = new Date();
      /** Últimos 24 meses, pedidos en lotes para no saturar o browser nem o servidor. */
      const monthSlots = Array.from({ length: 24 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        return { y: d.getFullYear(), m: d.getMonth() + 1 };
      });

      const [balRes, incRes, globalRes] = await Promise.all([
        fetch(`/api/v1/accounts/${accountId}/balance`, { headers, signal }),
        fetch("/api/v1/incomes", { headers, signal }),
        fetch("/api/v1/expenses", { headers, signal }),
      ]);

      if (signal.aborted) return;

      if (balRes.ok) {
        const balJson = await parseJsonFlexible<{ balance?: number }>(balRes);
        setBalanceCents(typeof balJson?.balance === "number" ? balJson.balance : null);
      } else {
        setBalanceCents(null);
      }

      const globalOk = globalRes.ok;
      setExpensesGlobalOk(globalOk);

      const incOk = incRes.ok;
      setIncomesOk(incOk);

      const expenseJsonParts: unknown[] = [];
      if (globalRes.ok) {
        expenseJsonParts.push(await globalRes.json().catch(() => null));
      }

      const BATCH = 5;
      for (let i = 0; i < monthSlots.length; i += BATCH) {
        if (signal.aborted) return;
        const slice = monthSlots.slice(i, i + BATCH);
        const rangeResponses = await Promise.all(
          slice.map(({ y, m }) =>
            fetch(`/api/v1/expenses/date-range/${y}/${m}`, { headers, signal })
          )
        );
        for (const r of rangeResponses) {
          if (r.ok) expenseJsonParts.push(await r.json().catch(() => null));
        }
      }

      if (signal.aborted) return;

      const mergedExpenses = mergeLedgerExpenseSources(...expenseJsonParts);
      const incomesData = incOk ? await incRes.json().catch(() => null) : null;
      const incomesParsed = parseLedgerSourceList(incomesData);

      setRows(buildAccountLedger(accountId, mergedExpenses, incomesParsed));
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      console.error(e);
      setError("Falha de rede ou resposta inválida ao carregar movimentos.");
    } finally {
      if (abortRef.current === ac) setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    void load();
    return () => {
      abortRef.current?.abort();
    };
  }, [load]);

  const saldo = balanceCents ?? balanceHintCents;
  const saldoNonZero = saldo !== 0;
  const onlyOutflows =
    rows.length > 0 && rows.every((r) => r.direction === "saida");

  const columns: ColumnDef<AccountLedgerRow>[] = useMemo(
    () => [
      {
        key: "posted",
        header: "Data",
        className: "w-[11%] whitespace-nowrap",
        cell: (r) => (
          <span className="text-gray-600 text-theme-xs dark:text-gray-400">
            {formatDateDMY(r.postedDateRaw)}
          </span>
        ),
      },
      {
        key: "flow",
        header: "Fluxo",
        className: "w-[10%]",
        cell: (r) => (
          <span
            className={
              r.direction === "entrada"
                ? "text-theme-xs font-medium text-success-600 dark:text-success-400"
                : "text-theme-xs font-medium text-error-600 dark:text-error-400"
            }
          >
            {r.direction === "entrada" ? "Entrada" : "Saída"}
          </span>
        ),
      },
      {
        key: "kind",
        header: "Categoria",
        className: "w-[22%] min-w-0",
        cell: (r) => (
          <span className="line-clamp-2 text-theme-xs text-gray-800 dark:text-white/90">{r.kindLabel}</span>
        ),
      },
      {
        key: "description",
        header: "Descrição",
        className: "min-w-0 w-[42%]",
        cell: (r) => (
          <span
            className="line-clamp-2 block text-theme-xs text-gray-500 dark:text-gray-400"
            title={r.description}
          >
            {r.description}
          </span>
        ),
      },
      {
        key: "amount",
        header: "Valor",
        className: "w-[15%] text-right whitespace-nowrap",
        cell: (r) => (
          <span
            className={`text-theme-xs font-medium ${
              r.signedCents >= 0
                ? "text-success-600 dark:text-success-400"
                : "text-error-600 dark:text-error-400"
            }`}
          >
            {(r.signedCents / 100).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        ),
      },
    ],
    []
  );

  const emptyExplanation = (() => {
    if (error) return null;
    if (rows.length > 0) return null;
    if (loading) return null;

    const parts: string[] = [];

    if (expensesGlobalOk === false) {
      parts.push(
        "Não consegui obter a lista global de despesas (GET /api/v1/expenses). Mesmo assim juntei os últimos 24 meses via GET /api/v1/expenses/date-range/{ano}/{mês} (em lotes)."
      );
    }
    if (incomesOk === false) {
      parts.push("Não consegui obter a lista de ingressos (GET /api/v1/incomes).");
    }

    if (saldoNonZero) {
      parts.push(
        "O saldo desta conta vem do servidor (há movimento contabilístico), mas esta vista só lista o que as APIs de despesas e ingressos devolvem ligado explicitamente a esta conta no JSON (accountId, account.id, etc.). Se continua vazio, não significa que «não existam movimentos»: significa que não consigo mostrá-los com os dados expostos (extrato OFX, saldo inicial, lançamentos internos, etc.). A solução correta é o back-end expor um endpoint de movimentos por conta."
      );
    } else {
      parts.push(
        "Não há linhas para mostrar: ou não há despesas/ingressos associados a esta conta nas respostas recebidas, ou o saldo vem só de ajustes iniciais."
      );
    }

    return parts.join("\n\n");
  })();

  return (
    <div className="box-border block w-full min-w-0 max-w-none bg-white px-0 py-0 dark:bg-gray-900/50 sm:px-0">
      <div className="border-b border-gray-100 bg-gray-50/80 px-4 py-3 dark:border-white/[0.06] dark:bg-white/[0.04] sm:px-6 sm:py-3.5">
        <div className="flex flex-nowrap items-center justify-between gap-3">
          <h4
            className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-gray-900 dark:text-white/90"
            title={accountName}
          >
            {accountName}
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Fechar
          </button>
        </div>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Saldo (servidor):</span>
          <span
            className={`whitespace-nowrap tabular-nums text-base font-semibold tracking-tight ${
              saldo < 0 ? "text-error-500" : "text-gray-800 dark:text-gray-200"
            }`}
          >
            {formatBrlFromCents(saldo)}
          </span>
          {loading && (
            <span className="text-xs font-normal text-gray-400 dark:text-gray-500">(a sincronizar)</span>
          )}
        </p>
      </div>

      <div className="w-full min-w-0 px-4 pb-4 pt-3 sm:px-6 sm:pb-5">
        {loading && rows.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">A carregar movimentos…</p>
            <div
              className="h-24 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.06]"
              aria-hidden
            />
          </div>
        ) : error ? (
          <p className="text-sm text-error-500">{error}</p>
        ) : rows.length === 0 ? (
          <div className="w-full rounded-lg border border-amber-200/80 bg-amber-50/90 p-4 text-sm leading-relaxed text-amber-950 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100/95">
            <p className="font-medium text-amber-900 dark:text-amber-100">Sem linhas para este extrato</p>
            <div className="mt-2 whitespace-pre-line text-amber-900/90 dark:text-amber-50/90">
              {emptyExplanation}
            </div>
          </div>
        ) : (
          <>
            <DataTable fullWidth columns={columns} data={rows} />
            {onlyOutflows && (
              <p className="mt-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                Só aparecem «Saída» porque este extrato lista sobretudo{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">despesas</span> com
                conta no JSON. Os{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">ingressos</span>{" "}
                que recebemos da API muitas vezes não trazem ligação a esta conta; as entradas podem
                existir (outra conta, liquidação, extrato) mas não aparecem aqui até o servidor as
                expor ligadas à conta.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
