import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import { ResidentUnit, Recipient } from '../../types/residentUnit';
import { TrashBinIcon } from '../../icons';
import { parseJsonResponseBody } from '../../utils/safeJsonResponse';
import { getBaselineReferenceYmFromStorage, parseYm } from '../../utils/gasBaselineReference';

/** Interpreta m³ em formato livre (ex.: "1234,567" ou "1.234,567"). */
function parsePtBrM3(raw: string): number | null | 'invalid' {
  const t = raw.trim();
  if (t === '') return null;
  const normalized = t.replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return 'invalid';
  return n;
}

interface EditResidentUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: ResidentUnit | null;
  onUnitUpdate: () => void;
}

const EditResidentUnitModal: React.FC<EditResidentUnitModalProps> = ({ isOpen, onClose, unit, onUnitUpdate }) => {
  const [idealFraction, setIdealFraction] = useState<number | string>('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  /** Leitura de referência "inicial" no mês de referência escolhido em Boletos (ou mês atual até haver escolha). */
  const [initialGasM3, setInitialGasM3] = useState('');
  const [loadingGasReading, setLoadingGasReading] = useState(false);
  const [gasLoadError, setGasLoadError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (unit) {
      setIdealFraction(unit.idealFraction);
      setRecipients(unit.notificationRecipients || []);
    }
  }, [unit]);

  useEffect(() => {
    if (!isOpen || !unit) {
      setInitialGasM3('');
      setGasLoadError(null);
      setLoadingGasReading(false);
      return;
    }
    let cancelled = false;
    setLoadingGasReading(true);
    setGasLoadError(null);
    const ym = getBaselineReferenceYmFromStorage();
    const period = parseYm(ym);
    void (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          if (!cancelled) setGasLoadError('Token de autenticação não encontrado.');
          return;
        }
        if (!period) {
          if (!cancelled) setGasLoadError('Período de referência do gás inválido.');
          return;
        }
        const { year: y, month: m } = period;
        const res = await fetch(
          `/api/v1/gas/resident-units/${unit.id}/reading/${y}/${m}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as { reading?: number };
          const r = Number(data.reading);
          setInitialGasM3(
            Number.isFinite(r)
              ? r.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
              : '',
          );
        } else if (res.status === 404) {
          setInitialGasM3('');
        } else {
          setGasLoadError('Não foi possível carregar a leitura de gás deste mês.');
          setInitialGasM3('');
        }
      } catch {
        if (!cancelled) setGasLoadError('Falha ao carregar a leitura de gás.');
      } finally {
        if (!cancelled) setLoadingGasReading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, unit?.id]);

  const handleAddRecipient = () => {
    if (newRecipientName && newRecipientEmail) {
      setRecipients([...recipients, { name: newRecipientName, email: newRecipientEmail }]);
      setNewRecipientName('');
      setNewRecipientEmail('');
    }
  };

  const handleRemoveRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token de autenticação não encontrado.");
      }

      const gasParsed = parsePtBrM3(initialGasM3);
      if (gasParsed === 'invalid') {
        throw new Error('Indique um contador inicial de gás válido (m³, ≥ 0) ou deixe em branco para não alterar.');
      }
      const gasToSave = gasParsed;

      const response = await fetch(`/api/v1/resident-unit/update/${unit.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          idealFraction: Number(idealFraction),
          notificationRecipients: recipients,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Falha ao atualizar a unidade residencial.' }));
        throw new Error(errorData.message || 'Ocorreu um erro desconhecido.');
      }

      if (gasToSave !== null) {
        const period = parseYm(getBaselineReferenceYmFromStorage());
        if (!period) {
          throw new Error(
            'Defina o mês de referência do contador em Boletos (modal de contadores iniciais) antes de gravar o gás aqui.',
          );
        }
        const { year: readingYear, month: readingMonth } = period;
        const gasRes = await fetch('/api/v1/gas/reading', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: crypto.randomUUID(),
            residentUnitId: unit.id,
            year: readingYear,
            month: readingMonth,
            reading: gasToSave,
          }),
        });
        if (!gasRes.ok) {
          const errData = await parseJsonResponseBody<{ message?: string }>(gasRes);
          throw new Error(
            errData?.message ||
              'A unidade foi atualizada, mas falhou ao gravar o contador de gás. Tente de novo ou use Boletos para a leitura do período.',
          );
        }
      }

      onUnitUpdate();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Editar Unidade: ${unit?.unit}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="idealFraction" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Fração Ideal
          </label>
          <input
            type="number"
            id="idealFraction"
            value={idealFraction}
            onChange={(e) => setIdealFraction(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            required
            step="0.00000001"
          />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <label htmlFor="initialGasM3" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Contador inicial de gás (m³)
          </label>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Leitura do contador no mês de referência definido em Boletos. Até definir, usa-se o mês atual. Consumo mensal:
            página Boletos, «Consumo de gás por unidade».
          </p>
          {loadingGasReading && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">A carregar leitura…</p>
          )}
          <input
            type="text"
            id="initialGasM3"
            inputMode="decimal"
            value={initialGasM3}
            onChange={(e) => setInitialGasM3(e.target.value)}
            placeholder="Ex.: 1234,567"
            className="mt-2 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white disabled:opacity-60"
            disabled={loadingGasReading || isSubmitting}
            aria-busy={loadingGasReading}
          />
          {gasLoadError && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{gasLoadError}</p>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">Destinatários</h4>
            
            <div className="space-y-2 mt-4">
              {recipients.map((recipient, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg dark:bg-gray-800">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{recipient.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{recipient.email}</p>
                  </div>
                  <button type="button" onClick={() => handleRemoveRecipient(index)} className="text-gray-400 hover:text-error-500">
                    <TrashBinIcon className="size-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-1">
                <label htmlFor="newRecipientName" className="block text-xs font-medium text-gray-700 dark:text-gray-300">Nome</label>
                <input type="text" id="newRecipientName" value={newRecipientName} onChange={(e) => setNewRecipientName(e.target.value)} className="mt-1 block w-full px-3 py-2 text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div className="md:col-span-1">
                <label htmlFor="newRecipientEmail" className="block text-xs font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input type="email" id="newRecipientEmail" value={newRecipientEmail} onChange={(e) => setNewRecipientEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div className="md:col-span-1">
                <button type="button" onClick={handleAddRecipient} className="w-full px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600">Añadir</button>
              </div>
            </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600" disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:bg-brand-300" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditResidentUnitModal;