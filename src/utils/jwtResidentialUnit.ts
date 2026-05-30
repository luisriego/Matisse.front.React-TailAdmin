import { jwtDecode, JwtPayload } from "jwt-decode";

/** 
 * Bypass temporal post PUT /resident-unit (API devuelve 204 sin nuevo JWT).
 * Usa sessionStorage para que expire automáticamente al cerrar el navegador/pestaña.
 */
export const SETUP_UNIT_BYPASS_STORAGE_KEY = "setup.unitJustAssigned";

export function setSetupUnitBypass(): void {
  sessionStorage.setItem(SETUP_UNIT_BYPASS_STORAGE_KEY, "1");
}

export function clearSetupUnitBypass(): void {
  sessionStorage.removeItem(SETUP_UNIT_BYPASS_STORAGE_KEY);
  localStorage.removeItem(SETUP_UNIT_BYPASS_STORAGE_KEY); // limpiar residuos de versiones anteriores
}

export function isSetupUnitBypassActive(): boolean {
  return sessionStorage.getItem(SETUP_UNIT_BYPASS_STORAGE_KEY) === "1";
}

function normalizeJwtScalarToString(raw: unknown): string | null {
  if (typeof raw === "string" && raw.trim() !== "" && raw.trim() !== "null" && raw.trim() !== "undefined")
    return raw.trim();
  if (typeof raw === "number" && Number.isFinite(raw))
    return String(Math.trunc(raw));
  return null;
}

/**
 * Identificador do utilizador para `PUT /api/v1/users/{id}/resident-unit`.
 */
export function jwtPayloadUserApiId(
  decoded: JwtPayload & Record<string, unknown>,
): string | null {
  for (const k of ["userId", "user_id", "id", "sub", "uuid", "userUuid", "user_uuid"] as const) {
    const s = normalizeJwtScalarToString(decoded[k]);
    if (s) return s;
  }
  return null;
}

/**
 * Devuelve true si el JWT indica vínculo real con una unidad residencial (`residentUnitId`,
 * objeto anidado con `id`/`uuid`, etc.). No usa sólo el escalar «unit»: muchos tokens lo
 * envían ambiguo y eso impedía que apareciera el setup.
 */
export function decodedTokenHasResidentialUnit(
  decoded: JwtPayload & Record<string, unknown>,
): boolean {
  const rid =
    decoded.residentUnitId ??
    decoded.resident_unit_id ??
    decoded.unitId ??
    decoded.residential_unit_id;
  if (normalizeJwtScalarToString(rid)) return true;

  const ru =
    decoded.residentUnit ??
    decoded.resident_unit ??
    decoded.ResidentUnit ??
    decoded.residentialUnit ??
    decoded.user_residential_unit;
  if (ru && typeof ru === "object" && ru !== null && !Array.isArray(ru)) {
    const o = ru as Record<string, unknown>;
    if (normalizeJwtScalarToString(o.id)) return true;
    if (normalizeJwtScalarToString(o.uuid)) return true;
  }

  return false;
}

export function tokenHasResidentialUnit(token: string | null | undefined): boolean {
  if (!token) return false;
  try {
    const decoded = jwtDecode<JwtPayload & Record<string, unknown>>(token);
    return decodedTokenHasResidentialUnit(decoded);
  } catch {
    return false;
  }
}
