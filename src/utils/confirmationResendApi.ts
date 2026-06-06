import { extractApiErrorMessage } from "./extractApiErrorMessage";

export const CONFIRMATION_RESEND_DEFAULT_MESSAGE =
  "Se o seu e-mail estiver registrado e a conta ainda não foi ativada, você receberá um novo link de confirmação.";

export async function resendConfirmationEmail(email: string): Promise<string> {
  const res = await fetch("/api/v1/users/confirmation-resend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
  });

  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(
        res,
        "Não foi possível reenviar o e-mail de confirmação.",
      ),
    );
  }

  const body = (await res.json().catch(() => null)) as {
    message?: string;
  } | null;
  return body?.message?.trim() || CONFIRMATION_RESEND_DEFAULT_MESSAGE;
}
