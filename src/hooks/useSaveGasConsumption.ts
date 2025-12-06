import { useMutation, useQueryClient } from '@tanstack/react-query';

interface SaveGasConsumptionPayload {
  residentUnitId: string;
  year: number;
  month: number;
  reading: number;
}

const saveGasConsumptionAPI = async (payload: SaveGasConsumptionPayload) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Token de autenticação não encontrado.");

  const body = {
    id: crypto.randomUUID(),
    ...payload,
  };

  const response = await fetch('/api/v1/gas/reading', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Falha ao salvar a leitura de gás.');
  }

  return response.json();
};

export const useSaveGasConsumption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveGasConsumptionAPI,
    onSuccess: () => {
      // Al guardar un consumo, los datos de la página de slips
      // deben ser recargados para reflejar la nueva lectura.
      queryClient.invalidateQueries({ queryKey: ['slipsData'] });
    },
  });
};
