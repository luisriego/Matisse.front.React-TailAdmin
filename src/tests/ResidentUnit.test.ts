
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import ResidentUnits from '../pages/ResidentUnits';

describe('ResidentUnits Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows auth error when token is missing', async () => {
    render(
      React.createElement(HelmetProvider, null,
        React.createElement(MemoryRouter, null, 
          React.createElement(ResidentUnits)
        )
      )
    );
    expect(await screen.findByText(/Token de autenticação não encontrado/i)).toBeInTheDocument();
  });

  it('renders loading state and then empty state when units are zero', async () => {
    localStorage.setItem('token', 'mock-token');

    render(
      React.createElement(HelmetProvider, null,
        React.createElement(MemoryRouter, null, 
          React.createElement(ResidentUnits)
        )
      )
    );
    
    
    expect(screen.getByText(/Carregando/i)).toBeInTheDocument();
    
    
    expect(await screen.findByText(/Nenhuma unidade residencial registrada/i)).toBeInTheDocument();
  });
  it('renders a list of units when API returns data', async () => {
    localStorage.setItem('token', 'mock-token');

    
    server.use(
      http.get('/api/v1/resident-unit/actives', () => {
        return HttpResponse.json([
          {
            id: 'unit-1',
            unit: 'Apto 101',
            idealFraction: '0.005',
            isActive: true,
            notificationRecipients: [{ name: 'Juan Perez' }]
          },
          {
            id: 'unit-2',
            unit: 'Apto 102',
            idealFraction: '0.006',
            isActive: false,
            notificationRecipients: []
          }
        ]);
      })
    );

    render(
      React.createElement(HelmetProvider, null,
        React.createElement(MemoryRouter, null, 
          React.createElement(ResidentUnits)
        )
      )
    );

    
    expect(await screen.findByText('Apto 101')).toBeInTheDocument();
    
    
    expect(screen.getByText('0.005')).toBeInTheDocument();
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('Apto 102')).toBeInTheDocument();
    
    
    expect(screen.getByText('Sim')).toBeInTheDocument();
    expect(screen.getByText('Não')).toBeInTheDocument();
  });
});
