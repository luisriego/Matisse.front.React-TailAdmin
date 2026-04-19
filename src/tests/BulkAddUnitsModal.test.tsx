import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BulkAddUnitsModal from '../components/modal/BulkAddUnitsModal';


vi.stubGlobal('crypto', {
  randomUUID: () => 'mock-uuid-1234'
});

describe('BulkAddUnitsModal Integration', () => {
  const onUnitsAddedMock = vi.fn();
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'mock-token');
  });

  it('renders correctly when open', () => {
    render(
      <BulkAddUnitsModal 
        isOpen={true} 
        onClose={onCloseMock} 
        onUnitsAdded={onUnitsAddedMock} 
      />
    );
    expect(screen.getByText(/Inicializar Edifício \(Em Massa\)/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { container } = render(
      <BulkAddUnitsModal 
        isOpen={false} 
        onClose={onCloseMock} 
        onUnitsAdded={onUnitsAddedMock} 
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows error if a unit exceeds 10 characters', async () => {
    render(
      <BulkAddUnitsModal 
        isOpen={true} 
        onClose={onCloseMock} 
        onUnitsAdded={onUnitsAddedMock} 
      />
    );

    const textarea = screen.getByPlaceholderText(/Exemplo/i);
    
    fireEvent.change(textarea, { target: { value: 'Apartamento 101' } }); 
    
    const submitButton = screen.getByRole('button', { name: /Inicializar Edifício/i });
    fireEvent.click(submitButton);

    expect(await screen.findByText(/no máximo 10 caracteres/i)).toBeInTheDocument();
    expect(onUnitsAddedMock).not.toHaveBeenCalled();
  });

  it('submits successfully and calls callbacks on valid input', async () => {
    render(
      <BulkAddUnitsModal 
        isOpen={true} 
        onClose={onCloseMock} 
        onUnitsAdded={onUnitsAddedMock} 
      />
    );

    const textarea = screen.getByPlaceholderText(/Exemplo/i);
    
    fireEvent.change(textarea, { target: { value: 'Apto 101\nApto 102' } });
    
    const submitButton = screen.getByRole('button', { name: /Inicializar Edifício/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      
      expect(onUnitsAddedMock).toHaveBeenCalledTimes(1);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });
});
