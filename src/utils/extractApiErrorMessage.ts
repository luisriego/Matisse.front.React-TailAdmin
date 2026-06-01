import { parseJsonResponseBody } from "./safeJsonResponse";

/** Extrai mensagem legível de erros JSON da API Symfony. */
export async function extractApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = await parseJsonResponseBody<Record<string, unknown>>(response);
  if (body && typeof body.message === "string" && body.message.trim()) {
    return body.message.trim();
  }
  if (body && typeof body.detail === "string" && body.detail.trim()) {
    return body.detail.trim();
  }
  const text = body ? "" : await response.text().catch(() => "");
  if (text.trim()) return text.trim();
  return `${fallback} (HTTP ${response.status})`;
}

export function translateResidentUnitCreateError(
  message: string,
  unit: string,
): string {
  if (/cannot exceed 1\.0|não pode ser maior que 1/i.test(message)) {
    return `Não foi possível criar «${unit}»: a soma das frações no servidor já atinge o máximo (1,0). Pode haver unidades duplicadas ou parcialmente criadas — contacte o administrador ou limpe a base de dados.`;
  }
  if (/already exists/i.test(message)) {
    return `A unidade «${unit}» já existe no servidor.`;
  }
  return message.includes(unit) ? message : `${message} (unidade: ${unit})`;
}
