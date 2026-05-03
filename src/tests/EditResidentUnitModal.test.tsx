import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import EditResidentUnitModal from '../components/modal/EditResidentUnitModal';

describe('EditResidentUnitModal Integration', () => {
  const onUnitUpdateMock = vi.fn();
  const onCloseMock = vi.fn();
  const mockUnit = {
    id: 'unit-123',
    unit: 'Apto 101',
    idealFraction: 0.005,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: null as string | null,
    notificationRecipients: [{ name: 'Juan', email: 'juan@test.com' }]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'mock-token');

    server.use(
      http.get('/api/v1/gas/resident-units/:unitId/reading/:year/:month', () => {
        return HttpResponse.json({ reading: 10.25 });
      }),
      http.put('/api/v1/gas/reading', () => HttpResponse.json({}, { status: 201 })),
      http.patch('/api/v1/resident-unit/update/:id', () => {
        return HttpResponse.json({ status: 'updated' }, { status: 200 });
      }),
    );
  });

  it('renders correctly with unit data', async () => {
    render(
      <EditResidentUnitModal
        isOpen={true}
        onClose={onCloseMock}
        unit={mockUnit}
        onUnitUpdate={onUnitUpdateMock}
      />
    );

    expect(screen.getByText(/Editar Unidade: Apto 101/i)).toBeInTheDocument();

    const fractionInput = screen.getByLabelText(/Fração Ideal/i) as HTMLInputElement;
    expect(fractionInput.value).toBe('0.005');

    expect(screen.getByText('Juan')).toBeInTheDocument();
    expect(screen.getByText('juan@test.com')).toBeInTheDocument();

    expect(await screen.findByLabelText(/Contador inicial de gás/i)).toBeInTheDocument();
  });

  it('adds a new recipient correctly', () => {
    render(
      <EditResidentUnitModal
        isOpen={true}
        onClose={onCloseMock}
        unit={mockUnit}
        onUnitUpdate={onUnitUpdateMock}
      />
    );

    const nameInput = screen.getByLabelText(/Nome/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const addButton = screen.getByRole('button', { name: /Añadir/i });

    
    fireEvent.change(nameInput, { target: { value: 'Maria' } });
    fireEvent.change(emailInput, { target: { value: 'maria@test.com' } });
    fireEvent.click(addButton);

    
    expect(screen.getByText('Maria')).toBeInTheDocument();
    expect(screen.getByText('maria@test.com')).toBeInTheDocument();
  });

  it('submits updated data successfully and closes modal', async () => {
    render(
      <EditResidentUnitModal
        isOpen={true}
        onClose={onCloseMock}
        unit={mockUnit}
        onUnitUpdate={onUnitUpdateMock}
      />
    );

    await screen.findByLabelText(/Contador inicial de gás/i);

    const fractionInput = screen.getByLabelText(/Fração Ideal/i);
    fireEvent.change(fractionInput, { target: { value: '0.008' } });

    const submitBtn = screen.getByRole('button', { name: 'Salvar' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onUnitUpdateMock).toHaveBeenCalledTimes(1);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });
});
