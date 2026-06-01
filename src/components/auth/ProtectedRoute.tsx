import { jwtDecode } from "jwt-decode";
import type { JwtPayload } from "jwt-decode";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import SetupWizard from "../setup/SetupWizard";
import CoreSetupPanel from "../setup/CoreSetupPanel";
import { useSetupGate } from "../../hooks/useSetupGate";
import { clearSetupUnitBypass } from "../../utils/jwtResidentialUnit";
import { clearLocalBusinessSetupComplete } from "../../utils/setupApi";
import { isCoreSetupWorkPath } from "../../utils/setupCoreSteps";

/**
 * Rutas protegidas: valida JWT + bloqueia app com SetupWizard até existirem
 * unidades, tipos de ingreso/gasto e contas (dados mínimos del condomínio).
 */
const ProtectedRoute = () => {
  const token = localStorage.getItem("token");
  const location = useLocation();
  const setupGate = useSetupGate(token);

  if (!token) return <Navigate to="/signin" replace />;

  if (setupGate.unauthorized) {
    return <Navigate to="/signin" replace />;
  }

  try {
    const decoded = jwtDecode<JwtPayload & Record<string, unknown>>(token);
    if (
      decoded.exp != null &&
      typeof decoded.exp === "number" &&
      decoded.exp * 1000 < Date.now()
    ) {
      localStorage.removeItem("token");
      clearLocalBusinessSetupComplete();
      clearSetupUnitBypass();
      return <Navigate to="/signin" replace />;
    }
  } catch {
    localStorage.removeItem("token");
    clearLocalBusinessSetupComplete();
    clearSetupUnitBypass();
    return <Navigate to="/signin" replace />;
  }

  if (setupGate.loading && !setupGate.catalogs) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-gray-50 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-400">
        <p>A verificar sessão e configuração inicial…</p>
      </div>
    );
  }

  if (setupGate.error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 dark:bg-gray-900">
        <p className="text-sm text-red-600 dark:text-red-400">{setupGate.error}</p>
        <button
          type="button"
          onClick={() => void setupGate.refresh()}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (setupGate.needsSetup && setupGate.catalogs) {
    return (
      <SetupWizard
        initialStep={setupGate.initialStep}
        catalogs={setupGate.catalogs}
        bannerMessage={setupGate.bannerMessage}
        refreshing={setupGate.refreshing}
        onRefresh={setupGate.refresh}
      />
    );
  }

  if (
    setupGate.needsCoreSetup &&
    setupGate.catalogs &&
    setupGate.status
  ) {
    if (isCoreSetupWorkPath(location.pathname)) {
      return <Outlet />;
    }

    return (
      <CoreSetupPanel
        status={setupGate.status}
        onRefresh={setupGate.refresh}
        refreshing={setupGate.refreshing}
      />
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
