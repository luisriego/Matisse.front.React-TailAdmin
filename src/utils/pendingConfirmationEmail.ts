const STORAGE_KEY = "matisse_pending_confirmation_email";

/** Guarda o e-mail usado no cadastro (sessão do browser, não URL editável). */
export function setPendingConfirmationEmail(email: string): void {
  sessionStorage.setItem(STORAGE_KEY, email.trim());
}

export function getPendingConfirmationEmail(): string | null {
  const value = sessionStorage.getItem(STORAGE_KEY);
  return value?.trim() ? value.trim() : null;
}

export function clearPendingConfirmationEmail(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
