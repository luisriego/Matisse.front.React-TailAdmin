/** Token JWT válido para vitest / msw (`jwtDecode` debe aceptar el payload central). */

export function jwtFromPayload(payload: Record<string, unknown>): string {
  const b = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `eyJhbGciOiJIUzI1NiJ9.${b}.sig`;

}
