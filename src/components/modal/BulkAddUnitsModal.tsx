import React, { useState } from 'react';
import { Modal } from '../ui/modal';

interface BulkAddUnitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnitsAdded: () => void;
}

const BulkAddUnitsModal: React.FC<BulkAddUnitsModalProps> = ({ isOpen, onClose, onUnitsAdded }) => {
  const [textData, setTextData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setTextData(event.target.result.toString());
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const lines = textData.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) {
      setError("A lista de unidades não pode estar vazia.");
      setIsSubmitting(false);
      return;
    }
    const overLimit = lines.filter(line => line.length > 10);
    if (overLimit.length > 0) {
      setError(`O banco de dados aceita no máximo 10 caracteres por unidade. Corrija: ${overLimit.slice(0, 3).join(', ')}...`);
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token não encontrado.");

      const chunkArray = (array: string[], size: number) => {
        const result = [];
        for (let i = 0; i < array.length; i += size) {
          result.push(array.slice(i, i + size));
        }
        return result;
      };

      
      const chunks = chunkArray(lines, 5);

      for (const chunk of chunks) {
        const promises = chunk.map(unit => {
          return fetch('/api/v1/resident-unit/create', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              id: crypto.randomUUID(),
              unit: unit,
              idealFraction: 0,
              notificationRecipients: []
            })
          }).then(res => {
            if (!res.ok) throw new Error(`Erro ao criar a unidade ${unit}`);
            return res;
          });
        });

        await Promise.all(promises);
      }

      onUnitsAdded();
      onClose();
      setTextData('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro ao tentar criar as unidades.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-[600px] p-4 lg:p-10">
      <div className="flex flex-col gap-5 bg-white dark:bg-gray-900 rounded-2xl">
        <div>
          <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Inicializar Edifício (Em Massa)
          </h4>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Cole a lista de unidades (uma por linha) ou carregue um arquivo .txt. 
            Isso criará todas as unidades residenciais de uma só vez para começar a usar o sistema.
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-400">
              Carregar Arquivo .txt (Opcional)
            </label>
            <input 
              type="file" 
              accept=".txt,.csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-gray-800 dark:file:text-gray-300"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-400">
              Unidades Residenciais
            </label>
            <textarea
              rows={8}
              value={textData}
              onChange={(e) => setTextData(e.target.value)}
              placeholder="Exemplo:\nApartamento 101\nApartamento 102\nApartamento 103..."
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 focus:outline-none focus:ring-3"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-white/[0.03]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !textData.trim()}
              className="px-4 py-2 text-sm text-white rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Criando unidades...' : 'Inicializar Edifício'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default BulkAddUnitsModal;
