/**
 * Formats a number in cents into a BRL currency string.
 * @param valueInCents The value in cents.
 * @returns A string formatted as BRL currency (e.g., "R$ 123,45").
 */
export const formatCurrency = (valueInCents: number): string => {
  const valueInReais = valueInCents / 100;
  return valueInReais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};
