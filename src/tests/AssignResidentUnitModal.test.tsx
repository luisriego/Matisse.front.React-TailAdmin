import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AssignResidentUnitModal from '../components/auth/AssignResidentUnitModal';

describe('AssignResidentUnitModal Integration via MSW', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'mock-token');
  });

  it('renders Step 1 (Welcome Screen) when no units exist due to new DB', async () => {
    render(
      <MemoryRouter>
        <AssignResidentUnitModal 
          isOpen={true} 
          userId="mock-uuid"
          onClose={() => {}} 
        />
      </MemoryRouter>
    );
    
    
    expect(screen.getByText(/Carregando/i)).toBeInTheDocument();

    
    await waitFor(() => {
      expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument();
    });

    
    expect(screen.getByText(/Assistente de Inicialização \(Passo 1/i)).toBeInTheDocument();
  });

  it('navigates through wizard steps and ensures validation rules trigger', async () => {
    render(
      <MemoryRouter>
        <AssignResidentUnitModal isOpen={true} userId="mock-uuid" onClose={() => {}} />
      </MemoryRouter>
    );

    
    await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument());

    
    fireEvent.click(screen.getByRole('button', { name: /Começar Configuração/i }));

    expect(await screen.findByText(/Assistente de Inicialização \(Passo 2/i)).toBeInTheDocument();

    
    const input = screen.getByPlaceholderText(/Exemplo/i);
    fireEvent.change(input, { target: { value: 'Nome Muito Longo' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar Unidades e Avançar/i }));

    const lengthErrors = await screen.findAllByText(/excede 10 caracteres/i);
    expect(lengthErrors.length).toBeGreaterThan(0);

    
    fireEvent.change(input, { target: { value: 'Apto 102' } });
    fireEvent.change(screen.getByTitle('Fração ideal'), { target: { value: '1' } });
    fireEvent.change(screen.getByTitle('Contador inicial de gás (m³)'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar Unidades e Avançar/i }));

    expect(await screen.findByText(/Assistente de Inicialização \(Passo 3/i)).toBeInTheDocument();
  });
});
