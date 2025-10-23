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
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onAccountAdded,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [initialBalance, setInitialBalance] = useState(0);
  const [initialBalanceDate, setInitialBalanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setCode('');
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

      // 1. Create the account
      const createAccountPayload = {
        id: uuidv4(),
        name,
        code,
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
        if (createAccountResponse.status === 204) { // No Content
          newAccountId = createAccountPayload.id; // Use the ID we sent
        } else {
          try {
            const newAccount = await createAccountResponse.json();
            newAccountId = newAccount.id;
          } catch (jsonError) {
            console.error("Failed to parse JSON for new account creation, assuming ID from payload:", jsonError);
            newAccountId = createAccountPayload.id; // Fallback
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
          errorMessage = `Falha ao criar a conta: ${errorText.substring(0, 100)}`; // Truncate for display
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      // 2. Set initial balance if provided
      if (initialBalance !== 0) {
        const setBalancePayload = {
          amount: initialBalance * 100,
          date: initialBalanceDate,
        };

        const setBalanceResponse = await fetch(`/api/v1/accounts/${newAccountId}/initial-balance`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(setBalancePayload),
        });

        if (!setBalanceResponse.ok) {
          let errorMessage = 'Conta criada, mas falha ao definir o saldo inicial.';
          try {
            const errorData = await setBalanceResponse.json();
            errorMessage = errorData.message || errorMessage;
          } catch (jsonError) {
            const errorText = await setBalanceResponse.text().catch(() => 'Erro desconhecido.');
            console.error("Failed to parse JSON for initial balance error, raw response:", errorText);
            errorMessage = `Conta criada, mas falha ao definir o saldo inicial: ${errorText.substring(0, 100)}`;
          }
          setError(errorMessage);
          setLoading(false);
          return;
        }
      }

      // 3. Update description if provided (and include name and code)
      if (description.trim() !== '') {
        // Explicitly check if name and code are not empty before sending PATCH
        if (!name.trim() || !code.trim()) {
          setError('Nome e Código são obrigatórios para atualizar a descrição.');
          setLoading(false);
          return;
        }

        const updateDescriptionPayload = {
          name, // Include name
          code, // Include code
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
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Nova Conta">
      <form className="flex flex-col" onSubmit={handleSubmit}>
        <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
          <div className="mt-7">
            <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">Detalhes da Conta</h5>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Nome</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  placeholder="Nome da conta"
                />
              </div>
              <div className="sm:col-span-1">
                <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Código</label>
                <input
                  type="text"
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  placeholder="Código da conta"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Descripción</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-800"
                  placeholder="Descripción de la cuenta"
                ></textarea>
              </div>
              <div className="sm:col-span-1">
                <label htmlFor="initialBalance" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Saldo Inicial</label>
                <input
                  type="number"
                  id="initialBalance"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(parseFloat(e.target.value))}
                  step="0.01"
                  required
                  className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  placeholder="0.00"
                />
              </div>
              <div className="sm:col-span-1">
                  <DatePicker
                    id="initial-balance-date"
                    label="Data do Saldo"
                    defaultDate={initialBalanceDate}
                    onChange={([selectedDate]) => {
                      if (selectedDate) {
                        setInitialBalanceDate(selectedDate.toISOString().split('T')[0]);
                      }
                    }}
                    placeholder="Seleccionar data"
                  />
              </div>
            </div>
          </div>
        </div>
        {error && <ErrorAlert message={error} />}
        {success && <SuccessAlert message={success} />}
        <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
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
