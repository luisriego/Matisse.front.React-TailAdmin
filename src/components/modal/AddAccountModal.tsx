import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import { v4 as uuidv4 } from 'uuid';
import SuccessAlert from '../common/alerts/SuccessAlert';
import ErrorAlert from '../common/alerts/ErrorAlert';
import DatePicker from '../form/date-picker';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountAdded: () => void;
  /** Boletos / onboarding: não fechar ao clicar fora ou Escape sem ação explícita. */
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onAccountAdded,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [initialBalance, setInitialBalance] = useState(0);
  const [initialBalanceDate, setInitialBalanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setInitialBalance(0);
      setInitialBalanceDate(new Date().toISOString().split('T')[0]);
      setLoading(false);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Token de autenticação não encontrado.");
        setLoading(false);
        return;
      }

      const initialBalanceAmount = Math.round(
        (Number.isFinite(initialBalance) ? initialBalance : 0) * 100
      );

      const createAccountPayload = {
        id: uuidv4(),
        name,
        initialBalanceAmount,
        initialBalanceDate: initialBalanceDate,
        initial_balance_amount: initialBalanceAmount,
        initial_balance_in_cents: initialBalanceAmount,
        initial_balance_date: initialBalanceDate,
      };

      const createAccountResponse = await fetch('/api/v1/accounts/create', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(createAccountPayload),
      });

      let newAccountId: string;
      if (createAccountResponse.ok) {
        if (createAccountResponse.status === 204) { 
          newAccountId = createAccountPayload.id; 
        } else {
          try {
            const newAccount = await createAccountResponse.json();
            newAccountId = newAccount.id;
          } catch (jsonError) {
            console.error("Failed to parse JSON for new account creation, assuming ID from payload:", jsonError);
            newAccountId = createAccountPayload.id; 
          }
        }
      } else {
        let errorMessage = 'Falha ao criar a conta.';
        try {
          const errorData = await createAccountResponse.json();
          errorMessage = errorData.message || errorMessage;
        } catch (jsonError) {
          const errorText = await createAccountResponse.text().catch(() => 'Erro desconhecido.');
          console.error("Failed to parse JSON for account creation error, raw response:", errorText);
          errorMessage = `Falha ao criar a conta: ${errorText.substring(0, 100)}`; 
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      
      if (description.trim() !== '') {
        
        if (!name.trim()) {
          setError('Nome é obrigatório para atualizar a descrição.');
          setLoading(false);
          return;
        }

        const updateDescriptionPayload = {
          name,
          description,
        };

        const updateDescriptionResponse = await fetch(`/api/v1/accounts/${newAccountId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateDescriptionPayload),
        });

        if (!updateDescriptionResponse.ok) {
          let errorMessage = 'Conta criada, mas falha ao atualizar a descrição.';
          try {
            const errorData = await updateDescriptionResponse.json();
            errorMessage = errorData.message || errorMessage;
          } catch (jsonError) {
            const errorText = await updateDescriptionResponse.text().catch(() => 'Erro desconhecido.');
            console.error("Failed to parse JSON for description update error, raw response:", errorText);
            errorMessage = `Conta criada, mas falha ao atualizar a descripción: ${errorText.substring(0, 100)}`;
          }
          setError(errorMessage);
          setLoading(false);
          return;
        }
      }

      setSuccess('Conta criada com sucesso!');
      onAccountAdded();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message || 'Ocorreu um erro de rede.');
        } else {
            setError('Ocorreu um erro desconhecido.');
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Nova Conta"
      showCloseButton={showCloseButton}
      closeOnBackdropClick={closeOnBackdropClick}
      closeOnEscape={closeOnEscape}
      widthClass="max-w-2xl"
    >
      <form className="flex flex-col" onSubmit={handleSubmit}>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Indique onde o condomínio mantém o dinheiro (caixa, banco, etc.) e quanto
          havia nessa conta na data de referência.
        </p>

        <div className="space-y-5">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Nome</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              placeholder="Ex.: Banco Principal, Caixa"
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Descrição</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              placeholder="Opcional — ex.: conta corrente do BB, agência 1234"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="initialBalance" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Saldo inicial (R$)
              </label>
              <input
                type="number"
                id="initialBalance"
                value={initialBalance}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setInitialBalance(Number.isFinite(v) ? v : 0);
                }}
                step="0.01"
                required
                className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                placeholder="0,00"
              />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Valor que a conta tinha nessa data. Pode ser 0,00 se ainda não havia movimentos.
              </p>
            </div>
            <div className="min-w-0">
              <DatePicker
                id="initial-balance-date"
                label="Data de referência"
                defaultDate={initialBalanceDate}
                onChange={([selectedDate]) => {
                  if (selectedDate) {
                    setInitialBalanceDate(selectedDate.toISOString().split('T')[0]);
                  }
                }}
                placeholder="Seleccionar data"
              />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Dia em que esse saldo estava correcto (ex.: início do mês de abertura).
              </p>
            </div>
          </div>
        </div>

        {error && <ErrorAlert message={error} />}
        {success && <SuccessAlert message={success} />}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition bg-white rounded-lg text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300 ">Cancelar</button>
          <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition rounded-lg bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 ">
            {loading ? 'Salvando...' : 'Salvar Conta'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddAccountModal;
