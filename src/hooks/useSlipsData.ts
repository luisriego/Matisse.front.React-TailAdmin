import { useQuery } from '@tanstack/react-query';
import { ResidentUnit, GasReading, ExpenseType, Account } from '../types';

interface SlipsData {
  residentUnits: ResidentUnit[];
  gasReadings: GasReading[];
  expenseTypes: ExpenseType[];
  accounts: Account[];
  gasUnitPrice: string;
  isGasPriceDefined: boolean;
}

const fetchSpecificReading = async (unitId: string, year: number, month: number, token: string): Promise<number | null> => {
  const headers = { Authorization: `Bearer ${token}` };
  try {
    const response = await fetch(`/api/v1/gas/resident-units/${unitId}/reading/${year}/${month}`, { headers });
    if (response.ok) {
      const data = await response.json();
      return data.reading;
    }
    return null;
  } catch {
    return null;
  }
};

const fetchSlipsData = async (targetMonth: Date): Promise<SlipsData> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Token não encontrado.");
  const headers = { Authorization: `Bearer ${token}` };

  const [typesRes, unitsRes, accountsRes, gasPriceRes] = await Promise.all([
    fetch('/api/v1/expense-types', { headers }),
    fetch('/api/v1/resident-unit/actives', { headers }),
    fetch('/api/v1/accounts', { headers }),
    fetch('/api/v1/gas/price', { headers }),
  ]);

  if (!typesRes.ok) throw new Error('Falha ao carregar tipos de despesa.');
  if (!unitsRes.ok) throw new Error('Falha ao carregar unidades residenciais.');
  if (!accountsRes.ok) throw new Error('Falha ao carregar contas.');

  const expenseTypes = await typesRes.json();
  const residentUnits: ResidentUnit[] = await unitsRes.json();
  const accountsData = await accountsRes.json();
  const accounts = accountsData.accounts || [];

  let gasUnitPrice = '';
  let isGasPriceDefined = false;

  if (gasPriceRes.ok) {
    const gasPriceData = await gasPriceRes.json();
    const priceInReais = gasPriceData.price_per_m3_in_cents / 100;
    gasUnitPrice = priceInReais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    isGasPriceDefined = true;
  } else if (gasPriceRes.status !== 404) {
    throw new Error('Falha ao carregar o preço do gás.');
  }

  const previousReadingDate = new Date(targetMonth);
  previousReadingDate.setMonth(previousReadingDate.getMonth() - 2);
  const previousReadingYear = previousReadingDate.getFullYear();
  const previousReadingMonth = previousReadingDate.getMonth() + 1;

  const currentReadingDate = new Date(targetMonth);
  currentReadingDate.setMonth(currentReadingDate.getMonth() - 1);
  const currentReadingYear = currentReadingDate.getFullYear();
  const currentReadingMonth = currentReadingDate.getMonth() + 1;

  const readingsPromises = residentUnits.map(async unit => {
    const prevReading = await fetchSpecificReading(unit.id, previousReadingYear, previousReadingMonth, token);
    const currReading = await fetchSpecificReading(unit.id, currentReadingYear, currentReadingMonth, token);
    return {
      residentUnitId: unit.id,
      unit: unit.unit,
      previousReading: prevReading,
      currentReading: currReading !== null ? currReading.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '',
    };
  });

  const gasReadings = await Promise.all(readingsPromises);

  return { residentUnits, gasReadings, expenseTypes, accounts, gasUnitPrice, isGasPriceDefined };
};

export const useSlipsData = (targetMonth: Date | null) => {
  return useQuery<SlipsData, Error>({
    queryKey: ['slipsData', targetMonth?.getFullYear(), targetMonth?.getMonth()],
    queryFn: () => fetchSlipsData(targetMonth!),
    enabled: !!targetMonth, // La query solo se ejecuta si targetMonth no es nulo
  });
};
