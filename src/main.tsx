import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { clearSetupUnitBypass } from "./utils/jwtResidentialUnit";
import {
  isSetupApiWhitelistPath,
  pathnameFromFetchInput,
  tryHandle403SetupRequired,
} from "./utils/setupApi";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";

// Limpiar bypass residual de versiones anteriores (usaba localStorage)
localStorage.removeItem("setup.unitJustAssigned");

const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const response = await originalFetch(input, init);

  if (import.meta.env.MODE !== "test" && response.status === 403) {
    const pathname = pathnameFromFetchInput(input);
    if (
      pathname !== null &&
      !isSetupApiWhitelistPath(pathname)
    ) {
      void tryHandle403SetupRequired(response);
    }
  }

  if (response.status === 401) {
    localStorage.removeItem("token");
    clearSetupUnitBypass();
    window.location.href = "/signin";
  }
  return response;
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AppWrapper>
        <App />
      </AppWrapper>
    </ThemeProvider>
  </StrictMode>,
);
