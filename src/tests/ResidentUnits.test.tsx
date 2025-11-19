import { render, screen } from '@testing-library/react';
import ResidentUnits from '../pages/ResidentUnits';

test('renders the "Nova Unidade" button', () => {
  render(<ResidentUnits />);
  const buttonElement = screen.getByText(/Nova Unidade/i);
  expect(buttonElement).toBeInTheDocument();
});
