import { useMutation, useQueryClient } from '@tanstack/react-query';

interface SaveGasPricePayload {
  billAmountInCents: number;
  bufferPercentage: number;
}

const saveGasPriceAPI = async (payload: SaveGasPricePayload) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Token de autenticação não encontrado.");

  const response = await fetch('/api/v1/gas/price', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Falha ao definir o preço do gás.');
  }

  return response.json();
};

export const useSaveGasPrice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveGasPriceAPI,
    onSuccess: () => {
      // Cuando el precio del gas se guarda, los datos de la página de slips
      // deben ser recargados para reflejar el nuevo precio.
      queryClient.invalidateQueries({ queryKey: ['slipsData'] });
    },
  });
};
