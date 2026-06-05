import { extractApiErrorMessage } from "./extractApiErrorMessage";

export async function setUserPasswordWithToken(
  userId: string,
  token: string,
  newPassword: string,
): Promise<string> {
  const res = await fetch(
    `/api/v1/users/${encodeURIComponent(userId)}/password-reset/${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    },
  );

  if (!res.ok) {
    const msg = await extractApiErrorMessage(
      res,
      res.status === 404
        ? "Utilizador não encontrado."
        : res.status === 400
          ? "Link inválido ou expirado."
          : "Não foi possível definir a senha.",
    );
    throw new Error(msg);
  }

  const body = (await res.json().catch(() => null)) as {
    message?: string;
  } | null;
  if (body?.message?.trim()) return body.message.trim();
  return "Sua senha foi redefinida com sucesso. Você já pode fazer login.";
}
