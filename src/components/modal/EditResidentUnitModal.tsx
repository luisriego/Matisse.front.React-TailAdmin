import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import { ResidentUnit, Recipient } from '../../types/residentUnit';
import { TrashBinIcon } from '../../icons';

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
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (unit) {
      setIdealFraction(unit.idealFraction);
      setRecipients(unit.notificationRecipients || []);
    }
  }, [unit]);

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

      // Assuming a general update endpoint exists, similar to other modules.
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

      onUnitUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
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