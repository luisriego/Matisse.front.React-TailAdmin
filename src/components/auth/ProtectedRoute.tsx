import { jwtDecode } from "jwt-decode";
import type { JwtPayload } from "jwt-decode";
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { clearSetupUnitBypass } from "../../utils/jwtResidentialUnit";
import {
  SetupStatusFetchError,
  applyBusinessSetupCompleteFromStatus,
  fetchSetupStatus,
} from "../../utils/setupApi";

/**
 * Rutas tras login: comprobación léxica del token (exp) + ping a setup/status sólo para
 * detectar sesión inválida (401); ya no hay redirección forzosa a onboarding con modal.
 */
const ProtectedRoute = () => {
  const token = localStorage.getItem("token");
  const location = useLocation();

  type Gate = "loading" | "allow";
  const [gate, setGate] = useState<Gate>(() => (token ? "loading" : "allow"));

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      if (!token) return;
      try {
        const status = await fetchSetupStatus(token);
        applyBusinessSetupCompleteFromStatus(status);
        if (cancelled) return;
        clearSetupUnitBypass();
        setGate("allow");
      } catch (e) {
        if (cancelled) return;
        if (
          e instanceof SetupStatusFetchError &&
          e.statusCode === 401
        ) {
          localStorage.removeItem("token");
          clearSetupUnitBypass();
          return;
        }
        setGate("allow");
      }
    }

    void ping();
    return () => {
      cancelled = true;
    };
  }, [token, location.pathname]);

  if (!token) return <Navigate to="/signin" replace />;

  try {
    const decoded = jwtDecode<JwtPayload & Record<string, unknown>>(token);
    if (
      decoded.exp != null &&
      typeof decoded.exp === "number" &&
      decoded.exp * 1000 < Date.now()
    ) {
      localStorage.removeItem("token");
      clearSetupUnitBypass();
      return <Navigate to="/signin" replace />;
    }
  } catch {
    localStorage.removeItem("token");
    clearSetupUnitBypass();
    return <Navigate to="/signin" replace />;
  }

  if (gate === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-gray-50 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-400">
        <p>A verificar sessão…</p>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
