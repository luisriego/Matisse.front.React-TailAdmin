import type {
  ApiSetupForbiddenBody,
  OpeningReferenceMonthRequest,
  OpeningReferenceStatus,
  SetupBalancesPreviewResponse,
  SetupInitialBalancesRequest,
  SetupStatusPayload,
} from "../types/setupApi";

export const STORAGE_SETUP_REQUIRED_KEY = "setup.setupRequiredEnvelope";

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

    if (window.location.pathname !== "/") {
      window.location.replace("/");
    }
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
