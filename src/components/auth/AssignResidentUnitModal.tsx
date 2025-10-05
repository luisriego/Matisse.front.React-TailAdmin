import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/modal';
import Label from '../form/Label';
import Select from '../form/Select';
import Button from '../ui/button/Button';

interface AssignResidentUnitModalProps {
  isOpen: boolean;
  userId: string;
  onClose: () => void; // This onClose will be called when the unit is successfully linked
}

interface ResidentUnitOption {
  value: string;
  label: string;
}

const AssignResidentUnitModal: React.FC<AssignResidentUnitModalProps> = ({
  isOpen,
  userId,
  onClose,
}) => {
  const navigate = useNavigate();
  const [residentUnits, setResidentUnits] = useState<ResidentUnitOption[]>([]);
  const [selectedResidentUnitId, setSelectedResidentUnitId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchResidentUnits();
    }
  }, [isOpen]);

  const fetchResidentUnits = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token de autenticação não encontrado.');
      }

      const response = await fetch('/api/v1/resident-unit/actives', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Resident Units Fetch Response Status:', response.status);
      const responseText = await response.text();
      console.log('Resident Units Fetch Response Text:', responseText);

      if (!response.ok) {
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.message || 'Falha ao buscar unidades residenciais');
        } catch (e) {
          throw new Error(`Falha ao buscar unidades residenciais. Servidor respondeu com status ${response.status}`);
        }
      }

      const data = JSON.parse(responseText);
      const options = data.map((unit: any) => ({
        value: unit.id,
        label: unit.unit,
      }));
      setResidentUnits(options);
    } catch (err: any) {
      setError(err.message);
      console.error('Resident Units Fetch Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkResidentUnit = async () => {
    if (!selectedResidentUnitId) {
      setLinkError('Por favor, selecione uma unidade residencial.');
      return;
    }

    setLinkLoading(true);
    setLinkError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token de autenticação não encontrado.');
      }

      const response = await fetch(`/api/v1/users/${userId}/resident-unit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ residentUnitId: selectedResidentUnitId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao vincular unidade residencial');
      }

      onClose(); // Close modal on successful linking
      navigate('/'); // Redirect to dashboard after linking
    } catch (err: any) {
      setLinkError(err.message);
    } finally {
      setLinkLoading(false);
    }
  };

  // Custom onClose to prevent closing if unit not linked
  const handleModalClose = () => {
    // Only allow closing if a unit has been successfully linked
    // or if the modal is not meant to be strictly blocking (e.g., on initial load)
    // For this requirement, we prevent closing until linked.
    // The onClose prop from parent will be called only after successful linking.
  };

  return (
    <Modal isOpen={isOpen} onClose={handleModalClose} showCloseButton={false} className="max-w-lg mx-auto">
      <div className="p-6">
        <h3 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
          Atribuir Unidade Residencial
        </h3>
        <p className="mb-6 text-gray-500 dark:text-gray-400">
          Por favor, selecione sua unidade residencial para continuar.
        </p>

        {isLoading ? (
          <p>Carregando unidades...</p>
        ) : error ? (
          <p className="text-error-500">Erro: {error}</p>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Unidade Residencial</Label>
              <Select
                options={residentUnits}
                placeholder="Selecione uma unidade"
                onChange={setSelectedResidentUnitId}
                defaultValue={selectedResidentUnitId}
              />
            </div>
            {linkError && (
              <div className="text-sm text-center text-error-500">
                {linkError}
              </div>
            )}
            <Button
              className="w-full"
              size="sm"
              onClick={handleLinkResidentUnit}
              disabled={linkLoading || !selectedResidentUnitId}
            >
              {linkLoading ? 'Atribuindo...' : 'Atribuir Unidade'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AssignResidentUnitModal;
