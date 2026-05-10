import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import { Account } from '../../types/accountApi';
import DatePicker from '../form/date-picker'; 

interface SetInitialBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  onInitialBalanceSet: () => void;
}

interface PreviewBreakdownItem {
  accountName: string;
  absorbedInCents: number;
}

interface PreviewFinalBalanceItem {
  accountName: string;
  finalBalanceInCents: number;
}

interface InitialSetupPreview {
  previewId: string;
  bankBalanceInCents: number;
  accountsInputTotalInCents: number;
  discrepancyInCents: number;
  absorptionOrder: string[];
  absorbedBreakdown: PreviewBreakdownItem[];
  finalBalances: PreviewFinalBalanceItem[];
}

interface InitialSetupConfirmResult {
  adjustedAmountInCents: number;
  adjustedAccountName: string;
}

function toCents(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100);
}

function toCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function readNumber(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() && Number.isFinite(Number(raw))) return Number(raw);
  return 0;
}

function parsePreview(raw: Record<string, unknown>): InitialSetupPreview {
  const absorbedRaw =
    (Array.isArray(raw.absorbedBreakdown) ? raw.absorbedBreakdown : null) ??
    (Array.isArray(raw.absorbed_breakdown) ? raw.absorbed_breakdown : null) ??
    [];
  const finalRaw =
    (Array.isArray(raw.finalBalances) ? raw.finalBalances : null) ??
    (Array.isArray(raw.final_balances) ? raw.final_balances : null) ??
    [];
  const orderRaw =
    (Array.isArray(raw.absorptionOrder) ? raw.absorptionOrder : null) ??
    (Array.isArray(raw.absorption_order) ? raw.absorption_order : null) ??
    [];

  return {
    previewId: String(raw.previewId ?? raw.preview_id ?? '').trim(),
    bankBalanceInCents: readNumber(raw.bankBalanceInCents ?? raw.bank_balance_in_cents),
    accountsInputTotalInCents: readNumber(
      raw.accountsInputTotalInCents ?? raw.accounts_input_total_in_cents
    ),
    discrepancyInCents: readNumber(raw.discrepancyInCents ?? raw.discrepancy_in_cents),
    absorptionOrder: orderRaw.map((x) => String(x)),
    absorbedBreakdown: absorbedRaw
      .filter((x) => x && typeof x === 'object')
      .map((x) => {
        const row = x as Record<string, unknown>;
        return {
          accountName: String(row.accountName ?? row.account_name ?? '—'),
          absorbedInCents: readNumber(row.absorbedInCents ?? row.absorbed_in_cents),
        };
      }),
    finalBalances: finalRaw
      .filter((x) => x && typeof x === 'object')
      .map((x) => {
        const row = x as Record<string, unknown>;
        return {
          accountName: String(row.accountName ?? row.account_name ?? '—'),
          finalBalanceInCents: readNumber(row.finalBalanceInCents ?? row.final_balance_in_cents),
        };
      }),
  };
}

function parseConfirmResult(raw: Record<string, unknown>): InitialSetupConfirmResult {
  return {
    adjustedAmountInCents: readNumber(raw.adjustedAmountInCents ?? raw.adjusted_amount_in_cents),
    adjustedAccountName: String(raw.adjustedAccountName ?? raw.adjusted_account_name ?? '—'),
  };
}

const SetInitialBalanceModal: React.FC<SetInitialBalanceModalProps> = ({ isOpen, onClose, account, onInitialBalanceSet }) => {
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<InitialSetupPreview | null>(null);
  const [confirmUnderstood, setConfirmUnderstood] = useState(false);
  const [confirmTrace, setConfirmTrace] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount(0);
      setDate(new Date().toISOString().split('T')[0]);
      setError(null);
      setPreview(null);
      setConfirmUnderstood(false);
      setConfirmTrace(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setPreview(null);
    setConfirmUnderstood(false);
    setConfirmTrace(null);
  }, [amount, date, account?.id, isOpen]);

  const loadPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    setIsPreviewLoading(true);
    setError(null);
    setConfirmTrace(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Token de autenticação não encontrado.');
      setIsPreviewLoading(false);
      return;
    }

    try {
      const payload = {
        accountId: account.id,
        amountInCents: toCents(amount),
        date,
      };
      const response = await fetch('/api/v1/initial-setup/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const body = (await response.json()) as Record<string, unknown>;
        const parsed = parsePreview(body);
        if (!parsed.previewId) {
          setError('Preview inválido: resposta sem previewId.');
          setPreview(null);
          return;
        }
        setPreview(parsed);
        setConfirmUnderstood(false);
      } else {
        const errorData = await response.json();
        setPreview(null);
        setError(errorData.message || 'Ocorreu um erro ao calcular o preview do ajuste.');
        console.error('Error previewing initial setup:', errorData);
      }
    } catch (error) {
      setError('Falha na comunicação com o servidor. Tente novamente.');
      console.error('Error previewing initial setup:', error);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview || !account) return;
    setIsConfirmLoading(true);
    setError(null);
    setConfirmTrace(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Token de autenticação não encontrado.');
      setIsConfirmLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/v1/initial-setup/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ accountId: account.id, previewId: preview.previewId })
      });
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'Ocorreu um erro ao confirmar o ajuste.');
        return;
      }
      const body = (await response.json()) as Record<string, unknown>;
      const result = parseConfirmResult(body);
      const trace =
        result.adjustedAmountInCents !== 0
          ? `Se ajustó ${toCurrency(result.adjustedAmountInCents)} en cuenta ${result.adjustedAccountName}.`
          : 'Ajuste confirmado sem divergência final.';
      setConfirmTrace(trace);
      onInitialBalanceSet();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError('Falha na comunicação com o servidor. Tente novamente.');
      console.error('Error confirming initial setup:', err);
    } finally {
      setIsConfirmLoading(false);
    }
  };

  if (!isOpen || !account) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-3/4 max-w-[500px]">
      <div className="no-scrollbar relative overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Definir Saldo Inicial</h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">Defina o saldo inicial para a conta: {account.name}</p>
        </div>
        <form className="flex flex-col" onSubmit={loadPreview}>
          <div className="custom-scrollbar h-[200px] overflow-y-auto px-2 pb-3">
            <div className="mt-7">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5">
                <div className="col-span-1">
                  <label htmlFor="initial-balance-amount" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Valor</label>
                  <input
                    className=" h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3  dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30  bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700  dark:focus:border-brand-800"
                    type="number"
                    id="initial-balance-amount"
                    name="amount"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value))}
                    step="0.01"
                    required
                  />
                </div>
                <div className="col-span-1">
                  <DatePicker
                    id="initial-balance-date"
                    label="Data"
                    defaultDate={date}
                    onChange={([selectedDate]) => {
                      if (selectedDate) {
                        setDate(selectedDate.toISOString().split('T')[0]);
                      }
                    }}
                    placeholder="Seleccionar fecha"
                  />
                </div>
              </div>
            </div>
            {preview && (
              <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800/40">
                <h5 className="mb-2 font-semibold text-gray-800 dark:text-white/90">Preview do ajuste</h5>
                <p>Saldo banco: <strong>{toCurrency(preview.bankBalanceInCents)}</strong></p>
                <p>Soma por contas: <strong>{toCurrency(preview.accountsInputTotalInCents)}</strong></p>
                <p>Discrepância: <strong>{toCurrency(preview.discrepancyInCents)}</strong></p>
                <p>
                  Absorção: <strong>{preview.absorptionOrder.length > 0 ? preview.absorptionOrder.join(' -> ') : 'principal -> taxa extra -> fundo reserva'}</strong>
                </p>
                {preview.absorbedBreakdown.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Como foi absorvido</p>
                    <ul className="list-disc pl-5">
                      {preview.absorbedBreakdown.map((item, idx) => (
                        <li key={`${item.accountName}-${idx}`}>
                          {item.accountName}: {toCurrency(item.absorbedInCents)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {preview.finalBalances.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Saldos finais a persistir</p>
                    <ul className="list-disc pl-5">
                      {preview.finalBalances.map((item, idx) => (
                        <li key={`${item.accountName}-final-${idx}`}>
                          {item.accountName}: {toCurrency(item.finalBalanceInCents)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <label className="mt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={confirmUnderstood}
                    onChange={(e) => setConfirmUnderstood(e.target.checked)}
                  />
                  Entiendo y confirmo el ajuste.
                </label>
              </div>
            )}
          </div>
          {error && <p className="text-red-500 text-sm mt-4 px-2">{error}</p>}
          {confirmTrace && <p className="text-green-600 text-sm mt-4 px-2">{confirmTrace}</p>}
          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
            <button type="button" onClick={onClose} className="inline-flex items-center justify-center gap-2 rounded-lg transition  px-4 py-3 text-sm bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300 ">Cancelar</button>
            <button type="submit" disabled={isPreviewLoading || isConfirmLoading} className="inline-flex items-center justify-center gap-2 rounded-lg transition  px-4 py-3 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 ">
              {isPreviewLoading ? 'Calculando...' : 'Gerar Preview'}
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={!preview || !confirmUnderstood || isConfirmLoading || isPreviewLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg transition px-4 py-3 text-sm bg-success-500 text-white shadow-theme-xs hover:bg-success-600 disabled:bg-gray-300"
            >
              {isConfirmLoading ? 'Confirmando...' : 'Confirmar ajuste'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default SetInitialBalanceModal;