import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import { ResidentUnit, NotificationRecipient } from '../../types/user';

interface EditUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: ResidentUnit | null;
}

const EditUnitModal: React.FC<EditUnitModalProps> = ({ isOpen, onClose, unit }) => {
  const [formData, setFormData] = useState<ResidentUnit | null>(unit);
  const [newRecipient, setNewRecipient] = useState<NotificationRecipient>({ name: '', email: '' });

  useEffect(() => {
    setFormData(unit);
  }, [unit]);

  const handleNewRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewRecipient({ ...newRecipient, [e.target.name]: e.target.value });
  };

  const handleAddRecipient = () => {
    if (formData && newRecipient.name && newRecipient.email) {
      const updatedRecipients = [...formData.notificationRecipients, newRecipient];
      setFormData({ ...formData, notificationRecipients: updatedRecipients });
      setNewRecipient({ name: '', email: '' });
    }
  };

  const handleRemoveRecipient = (index: number) => {
    if (formData) {
      const updatedRecipients = formData.notificationRecipients.filter((_, i) => i !== index);
      setFormData({ ...formData, notificationRecipients: updatedRecipients });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log('Updated unit data:', formData);
    onClose();
  };

  if (!isOpen || !formData) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-3/4 max-w-[700px]">
      <div className="no-scrollbar relative overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Editar Informação da Unidade</h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">Atualize os destinatários de notificação.</p>
        </div>
        <form className="flex flex-col" onSubmit={handleSubmit}>
          <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
            <div className="mt-7">
              <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">Destinatários de Notificação</h5>
              
              {/* List of current recipients */}
              <div className="space-y-4 mb-6">
                {formData.notificationRecipients.map((recipient, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">{recipient.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{recipient.email}</p>
                    </div>
                    <button type="button" onClick={() => handleRemoveRecipient(index)} className="text-red-500 hover:text-red-700">
                      Remover
                    </button>
                  </div>
                ))}
              </div>

              {/* Form to add a new recipient */}
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                <div className="col-span-2 lg:col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Nome do Novo Destinatário</label>
                  <div className="relative">
                    <input
                      className=" h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3  dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30  bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90  dark:focus:border-brand-800"
                      type="text"
                      name="name"
                      value={newRecipient.name}
                      onChange={handleNewRecipientChange}
                    />
                  </div>
                </div>
                <div className="col-span-2 lg:col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Email do Novo Destinatário</label>
                  <div className="relative">
                    <input
                      className=" h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3  dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30  bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90  dark:focus:border-brand-800"
                      type="email"
                      name="email"
                      value={newRecipient.email}
                      onChange={handleNewRecipientChange}
                    />
                  </div>
                </div>
              </div>
              <button type="button" onClick={handleAddRecipient} className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg transition px-4 py-3 text-sm bg-blue-500 text-white shadow-theme-xs hover:bg-blue-600 disabled:bg-blue-300">
                Adicionar Destinatário
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
            <button type="button" onClick={onClose} className="inline-flex items-center justify-center gap-2 rounded-lg transition  px-4 py-3 text-sm bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300 ">Fechar</button>
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg transition  px-4 py-3 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 ">Salvar Alterações</button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditUnitModal;