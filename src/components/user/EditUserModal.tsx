import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import { User } from '../../types/user';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserUpdate: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onUserUpdate }) => {
  const [formData, setFormData] = useState<User | null>(user);

  useEffect(() => {
    setFormData(user);
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (formData) {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      return;
    }

    try {
      const response = await fetch(`http://localhost:1000/api/v1/users/${formData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.status === 204) {
        // Update session storage
        const { residentUnit, ...userData } = formData;
        sessionStorage.setItem('user', JSON.stringify(userData));
        if (residentUnit) {
          sessionStorage.setItem('unit', JSON.stringify(residentUnit));
        }
        onUserUpdate();
        onClose();
      } else {
        const errorData = await response.json();
        console.error('Error updating user:', errorData);
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  if (!isOpen || !formData) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-3/4 max-w-[700px]">
      <div className="no-scrollbar relative overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Editar Informações Pessoais</h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">Atualize seus dados para manter seu perfil atualizado.</p>
        </div>
        <form className="flex flex-col" onSubmit={handleSubmit}>
          <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
            <div className="mt-7">
              <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">Informações Pessoais</h5>
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                <div className="col-span-2 lg:col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Nome</label>
                  <div className="relative">
                    <input
                      className=" h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3  dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30  bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90  dark:focus:border-brand-800"
                      type="text"
                      name="name"
                      value={formData.name || ''}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="col-span-2 lg:col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Sobrenome</label>
                  <div className="relative">
                    <input
                      className=" h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3  dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30  bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90  dark:focus:border-brand-800"
                      type="text"
                      name="lastName"
                      value={formData.lastName || ''}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="col-span-2 lg:col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Telefone</label>
                  <div className="relative">
                    <input
                      className=" h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3  dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30  bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90  dark:focus:border-brand-800"
                      type="text"
                      name="phoneNumber"
                      value={formData.phoneNumber || ''}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="col-span-2 lg:col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Gênero</label>
                  <div className="relative">
                    <input
                      className=" h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3  dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30  bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90  dark:focus:border-brand-800"
                      type="text"
                      name="gender"
                      value={formData.gender || ''}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
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

export default EditUserModal;