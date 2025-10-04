import React,
 { useState, useEffect } from 'react';
import PageMeta from '../components/common/PageMeta';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import ComponentCard from '../components/common/ComponentCard';
import DataTable, { ColumnDef } from '../components/tables/DataTable';


interface ExpenseType {
  id: string;
  name: string;
}

interface ResidentUnit {
  id: string;
  unit: string;
}

// Interfaz actualizada para coincidir con la respuesta de la API
interface Expense {
  id: string;
  description: string;
  amount: number; // in cents
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  residentUnitId: string | null;
  expenseType: ExpenseType;
}

interface ApiExpense {
  id: string;
  description: string;
  amount: number;
  dueDate: { date: string };
  paidAt: { date: string } | null;
  createdAt: { date: string };
  residentUnitId: string | null;
  type: {
    id: string;
    code: string;
    name: string;
    description: string;
    distributionMethod: string;
  };
}

// Interfaz para la respuesta de la API de unidades
interface ApiResidentUnit {
  id: string;
  unit: string;
}

const Expenses: React.FC = () => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseTypeId, setExpenseTypeId] = useState('');
  const [residentUnitId, setResidentUnitId] = useState('');

  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [residentUnits, setResidentUnits] = useState<ResidentUnit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expensesError, setExpensesError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);


  // Carga de datos para los selectores (Tipos de Despesa y Unidades)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token não encontrado.");

        // Cargar Tipos de Despesa desde la API
        const expenseTypesResponse = await fetch('/api/v1/expense-types', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!expenseTypesResponse.ok) throw new Error('Falha ao carregar tipos de despesa.');
        const expenseTypesData: ExpenseType[] = await expenseTypesResponse.json();
        setExpenseTypes(expenseTypesData);

        // Cargar Unidades Residenciales desde la API
        const unitsResponse = await fetch('/api/v1/resident-unit/actives', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!unitsResponse.ok) throw new Error('Falha ao carregar unidades residenciais.');
        const unitsData: ApiResidentUnit[] = await unitsResponse.json();
        setResidentUnits(unitsData);
      } catch (err) {
        console.error("Erro ao carregar dados iniciais:", err);
      }
    };
    fetchInitialData();
  }, []);

  // Simulación de carga de despesas
  useEffect(() => {
    const fetchExpenses = async () => {
      setLoadingExpenses(true);
      setExpensesError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Token de autenticação não encontrado.");
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // getMonth() es 0-indexado

        const response = await fetch(`/api/v1/expenses/date-range/${year}/${month}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ApiExpense[] = await response.json();

        // Mapeamos la respuesta de la API a la estructura que espera el frontend
        const formattedExpenses: Expense[] = data.map(exp => ({
          ...exp,
          dueDate: exp.dueDate.date,
          paidAt: exp.paidAt ? exp.paidAt.date : null,
          createdAt: exp.createdAt.date,
          expenseType: exp.type,
        }));

        setExpenses(formattedExpenses);
      } catch (err: any) {
        setExpensesError('Falha ao carregar as despesas.');
        console.error("Failed to fetch expenses:", err);
      } finally {
        setLoadingExpenses(false);
      }
    };

    fetchExpenses();
  }, []);

  const handleEdit = (expense: Expense) => {
    console.log('Edit:', expense);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token de autenticação não encontrado.");
      }

      const expenseData = {
        description,
        amount: Math.round(parseFloat(amount) * 100), // Enviar como centavos
        expenseDate,
        expenseTypeId,
        residentUnitId: residentUnitId || null,
      };

      // Endpoint de ejemplo, necesitará ser ajustado al real
      const response = await fetch('/api/v1/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(expenseData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao criar a despesa.');
      }

      setSuccess('Despesa criada com sucesso!');
      // Limpiar formulario
      setDescription('');
      setAmount('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setExpenseTypeId('');
      setResidentUnitId('');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnDef<Expense>[] = [
    {
      key: 'description',
      header: 'Descrição',
      cell: (expense) => (
        <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
          {expense.description}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Monto',
      className: 'w-40 text-right',
      cell: (expense) => (
        <span className="text-gray-800 text-theme-sm dark:text-white/90">
          {(expense.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Vencimento',
      className: 'w-32',
      cell: (expense) => (
        <span className="text-gray-500 text-theme-sm dark:text-gray-400">
          {new Date(expense.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
        </span>
      ),
    },
    {
      key: 'expenseType',
      header: 'Tipo',
      className: 'w-48',
      cell: (expense) => (
        <span className="text-gray-500 text-theme-sm dark:text-gray-400">{expense.expenseType.name}</span>
      ),
    },
    {
      key: 'residentUnit',
      header: 'Unidade',
      className: 'w-40',
      cell: (expense) => {
        // Buscamos la unidad residencial en el estado `residentUnits` usando el `residentUnitId` del gasto
        const unit = residentUnits.find(u => u.id === expense.residentUnitId);
        return (
          <span className="text-gray-500 text-theme-sm dark:text-gray-400">
            {unit ? unit.unit : 'Geral'}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <PageMeta
        title="Despesas | Matisse"
        description="Página para registro de novas despesas"
      />
      <PageBreadcrumb pageTitle="Despesas" />

      <div className="space-y-6">
        <ComponentCard title="Registrar Nova Despesa">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Descrição</label>
              <input type="text" id="description" value={description} onChange={(e) => setDescription(e.target.value)} required className="form-input" />
            </div>

            <div>
              <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Monto (R$)</label>
              <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} required step="0.01" className="form-input" placeholder="150.50" />
            </div>

            <div>
              <label htmlFor="expenseDate" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Data da Despesa</label>
              <input type="date" id="expenseDate" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required className="form-input" />
            </div>

            <div>
              <label htmlFor="expenseType" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Tipo de Despesa</label>
              <select id="expenseType" value={expenseTypeId} onChange={(e) => setExpenseTypeId(e.target.value)} required className="form-select">
                <option value="">Selecione um tipo</option>
                {expenseTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="residentUnit" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Unidade Residencial (Opcional)</label>
              <select id="residentUnit" value={residentUnitId} onChange={(e) => setResidentUnitId(e.target.value)} className="form-select">
                <option value="">Nenhuma / Geral</option>
                {residentUnits.map(unit => (
                  <option key={unit.id} value={unit.id}>{unit.unit}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex items-center justify-end gap-4">
              {error && <p className="text-sm text-error-500">{error}</p>}
              {success && <p className="text-sm text-success-500">{success}</p>}
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Despesa'}
              </button>
            </div>
          </form>
        </ComponentCard>

        <ComponentCard title="Todas as despesas do mês atual">
          {loadingExpenses ? (
            <p className="text-center">Carregando despesas...</p>
          ) : expensesError ? (
            <p className="text-center text-error-500">{expensesError}</p>
          ) : expenses.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400">Nenhuma despesa registrada ainda.</p>
          ) : (
            <DataTable columns={columns} data={expenses} />
          )}
        </ComponentCard>
      </div>
    </>
  );
};

export default Expenses;
