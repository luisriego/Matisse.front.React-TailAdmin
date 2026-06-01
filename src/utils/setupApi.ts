import type {
  ApiSetupForbiddenBody,
  OpeningReferenceMonthRequest,
  OpeningReferenceStatus,
  SetupBalancesPreviewResponse,
  SetupInitialBalancesRequest,
  SetupStatusPayload,
} from "../types/setupApi";

export const STORAGE_SETUP_REQUIRED_KEY = "setup.setupRequiredEnvelope";

/**
 * Negocio: una vez el condominio está dado de alta (complete o mes de apertura en estado),
 * no volver a aplicar bloqueos ni mensajes de «setup pendiente» en el cliente.
 */
export const LOCAL_BUSINESS_SETUP_COMPLETE_KEY = "business.condominioSetupCompleto";

export function hasLocalBusinessSetupComplete(): boolean {
  return localStorage.getItem(LOCAL_BUSINESS_SETUP_COMPLETE_KEY) === "1";
}

export function clearLocalBusinessSetupComplete(): void {
  localStorage.removeItem(LOCAL_BUSINESS_SETUP_COMPLETE_KEY);
}

/** Alta considerada terminada: bandera del servidor o snapshot de mes de apertura. */
export function shouldMarkBusinessSetupComplete(
  status: SetupStatusPayload,
): boolean {
  if (status.complete === true) return true;
  const o = status.openingReference;
  if (o !== null && o !== undefined && typeof o === "object") {
    const raw = o as Record<string, unknown>;
    const recAt =
      typeof raw.recordedAt === "string"
        ? raw.recordedAt
        : typeof raw.recorded_at === "string"
          ? (raw.recorded_at as string)
          : "";
    if (recAt.trim() !== "") return true;
    const rm =
      typeof raw.referenceMonth === "string"
        ? raw.referenceMonth
        : typeof raw.reference_month === "string"
          ? (raw.reference_month as string)
          : "";
    return /^\d{4}-\d{2}$/.test(rm.trim());
  }
  return false;
}

export function applyBusinessSetupCompleteFromStatus(
  status: SetupStatusPayload,
): void {
  if (shouldMarkBusinessSetupComplete(status)) {
    localStorage.setItem(LOCAL_BUSINESS_SETUP_COMPLETE_KEY, "1");
  }
}

/** Error al leer estado de setup — `statusCode` permite tratar 401 aparte */
export class SetupStatusFetchError extends Error {
  constructor(
    readonly statusCode: number,
    message = "Falha ao obter estado de configuração",
  ) {
    super(message);
    this.name = "SetupStatusFetchError";
  }
}

function unwrapEnvelope<T extends object>(raw: unknown): T {
  let cur: unknown = raw;
  for (let i = 0; i < 3; i++) {
    if (
      cur &&
      typeof cur === "object" &&
      "data" in (cur as object) &&
      (cur as { data: unknown }).data !== undefined
    ) {
      cur = (cur as { data: unknown }).data;
      continue;
    }
    if (
      cur &&
      typeof cur === "object" &&
      "content" in (cur as object) &&
      (cur as { content: unknown }).content !== undefined
    ) {
      cur = (cur as { content: unknown }).content;
      continue;
    }
    break;
  }
  return cur as T;
}

export function pathnameFromFetchInput(
  input: RequestInfo | URL,
): string | null {
  try {
    if (typeof input === "string") {
      const u = new URL(input, window.location.origin);
      return u.pathname;
    }
    if (input instanceof URL) return input.pathname;
    if (input instanceof Request)
      return new URL(input.url, window.location.origin).pathname;
    return null;
  } catch {
    return null;
  }
}

/** Rutas que el backend permite sin setup completo — no lanzar interceptor SETUP_REQUIRED. */
export function isSetupApiWhitelistPath(pathname: string | null): boolean {
  if (!pathname?.startsWith("/api/v1/")) return true;

  const p = pathname.replace(/\/+$/, "") || pathname;

  if (p.startsWith("/api/v1/setup")) return true;
  if (p.startsWith("/api/v1/bank/")) return true;
  if (p === "/api/v1/accounts" || p.startsWith("/api/v1/accounts/")) return true;
  if (
    p === "/api/v1/expense-types" ||
    p.startsWith("/api/v1/expense-types/")
  )
    return true;
  if (p === "/api/v1/income-types" || p.startsWith("/api/v1/income-types/"))
    return true;
  if (p.startsWith("/api/v1/resident-unit")) return true;
  if (p.startsWith("/api/v1/gas/")) return true;
  if (p.startsWith("/api/v1/slips")) return true;
  if (p === "/api/v1/login_check") return true;
  if (p.startsWith("/api/v1/users/register")) return true;
  if (p.startsWith("/api/v1/users/activate")) return true;
  if (p.startsWith("/api/v1/users/password-reset")) return true;

  return false;
}

export async function fetchSetupStatus(
  token: string,
): Promise<SetupStatusPayload> {
  const res = await fetch("/api/v1/setup/status", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const rawUnknown = await res.json().catch(() => ({}));
  const raw = unwrapEnvelope<SetupStatusPayload & Record<string, unknown>>(
    rawUnknown,
  );

  if (!res.ok) {
    throw new SetupStatusFetchError(res.status);
  }

  const complete =
    typeof raw.complete === "boolean"
      ? raw.complete
      : Boolean(raw.complete ?? false);

  let openingReference: SetupStatusPayload["openingReference"];
  if (raw.openingReference === null) {
    openingReference = null;
  } else if (
    raw.openingReference &&
    typeof raw.openingReference === "object"
  ) {
    openingReference = raw.openingReference as OpeningReferenceStatus;
  }

  return {
    complete,
    currentStep: raw.currentStep ?? 0,
    steps:
      typeof raw.steps === "object" && raw.steps !== null
        ? (raw.steps as SetupStatusPayload["steps"])
        : {},
    message: typeof raw.message === "string" ? raw.message : undefined,
    openingReference,
  };
}

export async function tryHandle403SetupRequired(
  response: Response,
): Promise<boolean> {
  if (response.status !== 403) return false;
  if (hasLocalBusinessSetupComplete()) return false;

  try {
    const data = unwrapEnvelope<Partial<ApiSetupForbiddenBody>>(
      await response.clone().json(),
    );
    if (data?.error !== "SETUP_REQUIRED") return false;

    sessionStorage.setItem(
      STORAGE_SETUP_REQUIRED_KEY,
      JSON.stringify({
        message: typeof data.message === "string" ? data.message : "",
        setup:
          typeof data.setup === "object" && data.setup !== null
            ? data.setup
            : {},
        ts: Date.now(),
      }),
    );

    window.dispatchEvent(
      new CustomEvent("matisse:setup-required", {
        detail: data,
      }),
    );

    return true;
  } catch {
    return false;
  }
}

export async function postSetupOpeningReferenceMonth(
  token: string,
  body: OpeningReferenceMonthRequest,
): Promise<{ recorded: boolean }> {
  const res = await fetch("/api/v1/setup/opening-reference-month", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await res.json().catch(() => ({}));
  const out = unwrapEnvelope<{ recorded?: unknown }>(raw);

  if (!res.ok) {
    const msg =
      typeof (out as { message?: unknown }).message === "string"
        ? (out as { message: string }).message
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return {
    recorded: out.recorded === true,
  };
}

export async function postSetupInitialBalancesPreview(
  token: string,
  body: SetupInitialBalancesRequest,
): Promise<SetupBalancesPreviewResponse> {
  const res = await fetch("/api/v1/setup/initial-balances/preview", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const raw = await res.json().catch(() => ({}));
  const out = unwrapEnvelope<SetupBalancesPreviewResponse>(raw);
  if (!res.ok) {
    const msg =
      typeof (out as { message?: unknown }).message === "string"
        ? (out as { message: string }).message
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return out;
}

export async function postSetupInitialBalancesConfirm(
  token: string,
  body: SetupInitialBalancesRequest,
): Promise<void> {
  const res = await fetch("/api/v1/setup/initial-balances/confirm", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const raw = unwrapEnvelope<{ message?: string }>(
      await res.json().catch(() => ({})),
    );
    throw new Error(raw.message ?? `HTTP ${res.status}`);
  }
}

export function clearStoredSetupRequired(): void {
  sessionStorage.removeItem(STORAGE_SETUP_REQUIRED_KEY);
}

export function readStoredSetupRequired(): {
  message: string;
  setup: SetupStatusPayload;
} | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_SETUP_REQUIRED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      message?: unknown;
      setup?: unknown;
    };
    if (typeof parsed.setup !== "object" || parsed.setup === null) return null;
    return {
      message: typeof parsed.message === "string" ? parsed.message : "",
      setup: parsed.setup as SetupStatusPayload,
    };
  } catch {
    return null;
  }
}
