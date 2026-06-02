import { useCallback, useEffect, useRef, useState } from "react";
import { clearSetupUnitBypass } from "../utils/jwtResidentialUnit";
import {
  applyBusinessSetupCompleteFromStatus,
  clearLocalBusinessSetupComplete,
  clearStoredSetupRequired,
  fetchSetupStatus,
  readStoredSetupRequired,
  SetupStatusFetchError,
} from "../utils/setupApi";
import type { SetupStatusPayload } from "../types/setupApi";
import { prefetchCatalogTypes } from "../utils/catalogCache";
import {
  fetchSetupCatalogs,
  prepareSetupStatusFromFetch,
  resolveSetupStep,
  type SetupCatalogs,
  type SetupBasicStep,
} from "../utils/setupGate";
import { resolveSetupGateFlags } from "../utils/setupCoreSteps";

export interface SetupGateState {
  loading: boolean;
  refreshing: boolean;
  needsSetup: boolean;
  /** Catálogos OK mas GET /setup/status.complete === false */
  needsCoreSetup: boolean;
  unauthorized: boolean;
  status: SetupStatusPayload | null;
  catalogs: SetupCatalogs | null;
  initialStep: SetupBasicStep;
  bannerMessage: string;
  error: string | null;
}

const idle: SetupGateState = {
  loading: true,
  refreshing: false,
  needsSetup: false,
  needsCoreSetup: false,
  unauthorized: false,
  status: null,
  catalogs: null,
  initialStep: 0,
  bannerMessage: "",
  error: null,
};

export function useSetupGate(token: string | null) {
  const [state, setState] = useState<SetupGateState>(idle);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async (): Promise<SetupStatusPayload | null> => {
    if (!token) {
      hasLoadedRef.current = false;
      setState({ ...idle, loading: false });
      return null;
    }

    const isInitial = !hasLoadedRef.current;
    setState((s) => ({
      ...s,
      loading: isInitial,
      refreshing: !isInitial,
      error: null,
      unauthorized: false,
    }));

    try {
      const storedEnvelope = readStoredSetupRequired();
      const apiStatus = await fetchSetupStatus(token);
      if (apiStatus.complete === true) {
        clearStoredSetupRequired();
      }
      const status = prepareSetupStatusFromFetch(
        apiStatus,
        storedEnvelope?.setup ?? null,
      );
      applyBusinessSetupCompleteFromStatus(status);

      await prefetchCatalogTypes(token);
      const catalogs = await fetchSetupCatalogs(token);
      const gate = resolveSetupGateFlags(catalogs, apiStatus, storedEnvelope?.setup ?? null);
      const step = gate.needsSetup ? resolveSetupStep(catalogs) : 0;

      hasLoadedRef.current = true;
      setState({
        loading: false,
        refreshing: false,
        needsSetup: gate.needsSetup,
        needsCoreSetup: gate.needsCoreSetup,
        unauthorized: false,
        status: gate.status,
        catalogs,
        initialStep: step,
        bannerMessage:
          storedEnvelope?.message?.trim() ||
          gate.status.message?.trim() ||
          "",
        error: null,
      });
      return apiStatus;
    } catch (e) {
      if (e instanceof SetupStatusFetchError && e.statusCode === 401) {
        localStorage.removeItem("token");
        clearLocalBusinessSetupComplete();
        clearSetupUnitBypass();
        hasLoadedRef.current = false;
        setState({ ...idle, loading: false, unauthorized: true });
        return null;
      }
      hasLoadedRef.current = true;
      setState((s) => ({
        ...s,
        loading: false,
        refreshing: false,
        error:
          e instanceof Error
            ? e.message
            : "Falha ao verificar configuração inicial",
      }));
      return null;
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onSetupRequired = () => {
      void refresh();
    };
    window.addEventListener("matisse:setup-required", onSetupRequired);
    return () => {
      window.removeEventListener("matisse:setup-required", onSetupRequired);
    };
  }, [refresh]);

  return { ...state, refresh };
}
