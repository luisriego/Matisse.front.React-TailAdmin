import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import SignInForm from '../components/auth/SignInForm';
import { jwtDecode } from 'jwt-decode';

vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn(),
}));

describe('SignInForm Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders login form correctly', () => {
    render(<MemoryRouter><SignInForm /></MemoryRouter>);
    expect(screen.getAllByText('Entrar').length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText('info@gmail.com')).toBeInTheDocument();
  });

  it('shows error message on failed login', async () => {
    server.use(
      http.post('/api/v1/login_check', () => {
        return HttpResponse.json({ message: 'Credenciais inválidas' }, { status: 401 });
      })
    );

    render(<MemoryRouter><SignInForm /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText('info@gmail.com'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Digite sua senha'), { target: { value: 'wrongpass' } });
    
    
    const submitBtn = screen.getByRole('button', { name: /Entrar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Credenciais inválidas')).toBeInTheDocument();
    });
  });

  it('logs in successfully and saves token', async () => {
    
    (jwtDecode as any).mockReturnValue({ id: 'user123', unit: 'Apto 101' });

    server.use(
      http.post('/api/v1/login_check', () => {
        return HttpResponse.json({ token: 'fake-jwt-token' });
      })
    );

    render(<MemoryRouter><SignInForm /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText('info@gmail.com'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Digite sua senha'), { target: { value: 'correctpass' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('fake-jwt-token');
    });
  });
});
