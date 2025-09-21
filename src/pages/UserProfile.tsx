import React, { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import PageMeta from "../components/common/PageMeta";
import AppLayout from "../layout/AppLayout";

interface DecodedToken {
  id: string;
  name: string;
  user: string; // This is the email
  unit: string | null; // Resident unit ID can be null
  roles: string;
}

const UserProfile: React.FC = () => {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userUnit, setUserUnit] = useState('');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken = jwtDecode<DecodedToken>(token);
        setUserName(decodedToken.name);
        setUserEmail(decodedToken.user);
        setUserUnit(decodedToken.unit || 'Não atribuída'); // Default if null
        setUserRole(decodedToken.roles);
      } catch (error) {
        console.error('Erro ao decodificar token:', error);
        // Handle invalid token, e.g., redirect to login
      }
    }
  }, []);

  return (
    <AppLayout>
      <PageMeta
        title="Perfil do Usuário | TailAdmin - Next.js Admin Dashboard Template"
        description="Página de perfil do usuário"
      />
      <div className="mx-auto max-w-242.5">
        <div className="overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="px-4 pb-6 text-center lg:pb-8 xl:pb-11.5">
            <div className="relative z-30 mx-auto -mt-22 h-30 w-full max-w-30 rounded-full bg-white/20 p-1 backdrop-blur sm:h-44 sm:max-w-44 sm:p-3">
              <div className="relative drop-shadow-2">
                <img src="/images/user/owner.jpg" alt="profile" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="mb-1.5 text-2xl font-semibold text-black dark:text-white">
                {userName}
              </h3>
              <p className="font-medium">{userRole}</p>
              <div className="mx-auto mt-4.5 mb-5.5 grid grid-cols-3 justify-center gap-y-4">
                <div className="flex flex-col items-center justify-center">
                  <span className="font-semibold text-black dark:text-white">E-mail</span>
                  <span className="text-sm">{userEmail}</span>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <span className="font-semibold text-black dark:text-white">Unidade Residencial</span>
                  <span className="text-sm">{userUnit}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default UserProfile;
