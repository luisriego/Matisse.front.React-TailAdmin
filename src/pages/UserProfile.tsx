import React, { useEffect, useState, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import { User, DecodedToken } from '../../types/user';
import EditUserModal from '../components/user/EditUserModal';
import EditUnitModal from '../components/unit/EditUnitModal';
import { UserCircleIcon } from '../icons';

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isEditUnitModalOpen, setIsEditUnitModalOpen] = useState(false);

  const fetchUserProfile = useCallback(async (userId: string, token: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: User = await response.json();
      setUser(data);

      // Save user and unit to sessionStorage
      const { residentUnit, ...userData } = data;
      sessionStorage.setItem('user', JSON.stringify(userData));
      if (residentUnit) {
        sessionStorage.setItem('unit', JSON.stringify(residentUnit));
      }

    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken = jwtDecode<DecodedToken>(token);
        fetchUserProfile(decodedToken.id, token);
      } catch (err) {
        console.error('Error decoding token:', err);
        setError('Invalid token');
        setLoading(false);
      }
    } else {
      setError('No token found');
      setLoading(false);
    }
  }, [fetchUserProfile]);

  const handleUserUpdate = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken = jwtDecode<DecodedToken>(token);
        fetchUserProfile(decodedToken.id, token);
      } catch (err) {
        console.error('Error decoding token:', err);
        setError('Invalid token');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-black dark:text-white">Carregando perfil...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-red-500">Erro: {error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-black dark:text-white">Perfil de usuário não encontrado.</p>
      </div>
    );
  }

  return (
    <div>
      <PageMeta
        title="Perfil do Usuário | Matisse - React.js Admin Dashboard Template"
        description="Esta é a página de perfil do usuário para o Matisse - React.js Tailwind CSS Admin Dashboard Template"
      />
      <PageBreadcrumb pageTitle="Perfil" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">Perfil</h3>
        <div className="space-y-6">
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
                <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800 flex items-center justify-center">
                  {user.gender === 'M' ? (
                    <img alt="user" src="/images/user/woman.jpg" className="w-full h-full object-cover" />
                  ) : user.gender === 'H' ? (
                    <img alt="user" src="/images/user/man.png" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircleIcon className="w-full h-full text-gray-400" />
                  )}
                </div>
                <div className="order-3 xl:order-2">
                  <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                    {user.name} {user.lastName}
                  </h4>
                  <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.roles.join(', ') || 'Nenhum papel atribuído'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">Informações Pessoais</h4>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Nome</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{user.name}</p>
                  </div>
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Sobrenome</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{user.lastName}</p>
                  </div>
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Endereço de e-mail</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{user.email}</p>
                  </div>
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Telefone</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{user.phoneNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Gênero</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{user.gender}</p>
                  </div>
                   <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Status</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{user.isActive ? 'Ativo' : 'Inativo'}</p>
                  </div>
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Membro desde</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{new Date(user.createdAt.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsEditUserModalOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto">
                <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z" fill="" /></svg>
                Editar
              </button>
            </div>
          </div>

          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">Informação da unidade</h4>
                {user.residentUnit ? (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                    <div>
                      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Unidade</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">{user.residentUnit.unit}</p>
                    </div>
                    <div>
                      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Fração Ideal</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">{user.residentUnit.idealFraction}</p>
                    </div>
                    <div>
                      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Status</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">{user.residentUnit.isActive ? 'Ativo' : 'Inativo'}</p>
                    </div>
                    <div>
                      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Criado em</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">{new Date(user.residentUnit.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="lg:col-span-2">
                      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Destinatários de Notificação</p>
                      {user.residentUnit.notificationRecipients.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 mt-2">
                          {user.residentUnit.notificationRecipients.map((recipient, index) => (
                            <div key={index} className="p-3 border rounded-lg grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Nome</p>
                                <p className="text-sm text-gray-800 dark:text-white/90">{recipient.name}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Email</p>
                                <p className="text-sm text-gray-800 dark:text-white/90">{recipient.email}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">Nenhum</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p>Não atribuído</p>
                )}
              </div>
               <button onClick={() => setIsEditUnitModalOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto">
                <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z" fill="" /></svg>
                Editar
              </button>
            </div>
          </div>

        </div>
      </div>

      <EditUserModal isOpen={isEditUserModalOpen} onClose={() => setIsEditUserModalOpen(false)} user={user} onUserUpdate={handleUserUpdate} />

      <EditUnitModal isOpen={isEditUnitModalOpen} onClose={() => setIsEditUnitModalOpen(false)} unit={user?.residentUnit} onUnitUpdate={handleUserUpdate} />
    </div>
  );
};

export default UserProfile;