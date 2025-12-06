import { useMutation, useQueryClient } from '@tanstack/react-query';

interface GenerateSlipsPayload {
  targetMonth: string;
  force?: boolean;
  extraFee: number;
  reserveFund: number;
}

const generateSlipsAPI = async (payload: GenerateSlipsPayload) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Token de autenticação não encontrado.");

  const response = await fetch('/api/v1/slips/generation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Falha ao gerar os boletos.');
  }

  return response.json();
};

export const useGenerateSlips = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateSlipsAPI,
    onSuccess: () => {
      // Al generar boletos, invalidamos queries que se ven afectadas
      // para que se actualicen automáticamente en toda la app.
      queryClient.invalidateQueries({ queryKey: ['pendingBills'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['accountsWithBalances'] });
      queryClient.invalidateQueries({ queryKey: ['slipsData'] }); // Invalidamos los datos de esta propia página
    },
  });
};
