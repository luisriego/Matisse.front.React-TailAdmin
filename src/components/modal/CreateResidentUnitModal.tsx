import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from '../ui/modal';
import { Recipient, ResidentUnit } from '../../types/residentUnit';
import { TrashBinIcon } from '../../icons';

interface CreateResidentUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnitCreate: () => void;
  residentUnits: ResidentUnit[];
}

const CreateResidentUnitModal: React.FC<CreateResidentUnitModalProps> = ({ isOpen, onClose, onUnitCreate, residentUnits }) => {
  const [unit, setUnit] = useState('');
  const [idealFraction, setIdealFraction] = useState<number | string>('');
  const [maxIdealFraction, setMaxIdealFraction] = useState<number>(1);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const totalFraction = residentUnits.reduce((sum, unit) => sum + unit.idealFraction, 0);
      const remainingFraction = 1 - totalFraction;
      const calculatedMax = remainingFraction > 0 ? remainingFraction : 0;
      
      setMaxIdealFraction(calculatedMax);
      setIdealFraction(calculatedMax.toFixed(8));
      
      // Reset other fields
      setUnit('');
      setRecipients([]);
      setNewRecipientName('');
      setNewRecipientEmail('');
      setError(null);
    }
  }, [isOpen, residentUnits]);

  const handleIdealFractionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (Number(value) > maxIdealFraction) {
      setError(`A fração ideal não pode ser maior que ${maxIdealFraction.toFixed(8)}.`);
      setIdealFraction(maxIdealFraction.toFixed(8));
    } else {
      setError(null);
      setIdealFraction(value);
    }
  };

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
    setIsSubmitting(true);
    setError(null);

    const unitId = uuidv4();

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token de autenticação não encontrado.");
      }

      // Step 1: Create the resident unit with an empty recipients list
      const createUnitResponse = await fetch(`/api/v1/resident-unit/create`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: unitId,
          unit,
          idealFraction: Number(idealFraction),
          notificationRecipients: [],
        }),
      });

      if (!createUnitResponse.ok) {
        const errorData = await createUnitResponse.json().catch(() => ({ message: 'Falha ao criar a unidade residencial.' }));
        throw new Error(errorData.message || 'Ocorreu um erro desconhecido.');
      }

      // Step 2: If unit creation is successful, add recipients one by one
      if (recipients.length > 0) {
        for (const recipient of recipients) {
          const addRecipientResponse = await fetch(`/api/v1/resident-unit/${unitId}/recipients`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(recipient),
          });

          if (!addRecipientResponse.ok) {
            const errorData = await addRecipientResponse.json().catch(() => ({ message: `Falha ao adicionar o destinatário ${recipient.email}.` }));
            throw new Error(errorData.message || `Ocorreu um erro desconhecido ao adicionar ${recipient.email}.`);
          }
        }
      }

      onUnitCreate();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro desconhecido.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAddRecipientDisabled = !newRecipientName || !newRecipientEmail;
  const isSubmitDisabled = !unit || isSubmitting;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Criar Nova Unidade Residencial">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Unidade
          </label>
          <input
            type="text"
            id="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            required
          />
        </div>

        <div>
          <label htmlFor="idealFraction" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Fração Ideal
          </label>
          <input
            type="number"
            id="idealFraction"
            value={idealFraction}
            onChange={handleIdealFractionChange}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            required
            step="0.00000001"
            max={maxIdealFraction.toFixed(8)}
          />
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
                <button type="button" onClick={handleAddRecipient} className="w-full px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:bg-brand-300" disabled={isAddRecipientDisabled}>Añadir</button>
              </div>
            </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600" disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:bg-brand-300" disabled={isSubmitDisabled}>
            {isSubmitting ? 'Criando...' : 'Criar'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateResidentUnitModal;