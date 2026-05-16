import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { http, HttpResponse } from "msw";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { server } from "./mocks/server";
import { jwtFromPayload } from "./mocks/mockJwt";
import { clearSetupUnitBypass } from "../utils/jwtResidentialUnit";
import { LOCAL_BUSINESS_SETUP_COMPLETE_KEY } from "../utils/setupApi";

const validToken = jwtFromPayload({ exp: 4102444800, id: "u1", sub: "u1" });

function protectedTree() {
  return (
    <Route element={<ProtectedRoute />}>
      <Route index element={<div>Conteúdo protegido</div>} />
      <Route path="/contas" element={<div>Página de contas</div>} />
    </Route>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearSetupUnitBypass();
  });

  it("redirige a /signin cuando não há token", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          {protectedTree()}
          <Route path="/signin" element={<div>Página de login</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Página de login")).toBeInTheDocument();
  });

  it("permite entrada após GET /api/v1/setup/status com complete=true", async () => {
    localStorage.setItem("token", validToken);
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          {protectedTree()}
          <Route path="/signin" element={<div>Página de login</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
    });
    expect(localStorage.getItem(LOCAL_BUSINESS_SETUP_COMPLETE_KEY)).toBe("1");
  });

  it("permite entrada mesmo quando complete=false (without modal onboarding)", async () => {
    localStorage.setItem("token", validToken);
    server.use(
      http.get("/api/v1/setup/status", () =>
        HttpResponse.json({
          data: {
            complete: false,
            currentStep: 2,
            steps: {},
            message: "Finalize o wizard.",
          },
        }),
      ),
    );
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          {protectedTree()}
          <Route path="/signin" element={<div>Página de login</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
    });
  });

  it("permite navegar a /contas", async () => {
    localStorage.setItem("token", validToken);
    server.use(
      http.get("/api/v1/setup/status", () =>
        HttpResponse.json({
          data: {
            complete: false,
            currentStep: 2,
            steps: {},
          },
        }),
      ),
    );
    render(
      <MemoryRouter initialEntries={["/contas"]}>
        <Routes>
          {protectedTree()}
          <Route path="/signin" element={<div>Página de login</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText("Página de contas")).toBeInTheDocument();
    });
  });
});
