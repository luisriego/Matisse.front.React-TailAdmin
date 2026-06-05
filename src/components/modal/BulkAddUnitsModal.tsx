import React, { useState } from 'react';
import { Modal } from '../ui/modal';
import ResidentUnitsBulkForm from '../resident-units/ResidentUnitsBulkForm';
import { createResidentUnitsBatch } from '../../utils/createResidentUnitsBatch';
import type { ParsedResidentUnitDraft } from '../../utils/parseBulkResidentUnitLines';

interface BulkAddUnitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnitsAdded: () => void;
}

const BulkAddUnitsModal: React.FC<BulkAddUnitsModalProps> = ({ isOpen, onClose, onUnitsAdded }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (drafts: ParsedResidentUnitDraft[]) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token não encontrado.");
      await createResidentUnitsBatch(token, drafts);
      onUnitsAdded();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Ocorreu um erro ao tentar criar as unidades.');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-[720px] p-4 lg:p-10">
      <div className="flex flex-col gap-5 bg-white dark:bg-gray-900 rounded-2xl">
        <div>
          <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Inicializar Edifício (Em Massa)
          </h4>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Indique unidade, fração ideal e e-mail do morador. A soma das frações
            deve ser 1,0000.
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
            {error}
          </div>
        )}

        <ResidentUnitsBulkForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Inicializar Edifício"
        />
      </div>
    </Modal>
  );
};

export default BulkAddUnitsModal;
