import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/auth/ProtectedRoute";

describe("ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("redirige a /signin cuando no hay token", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<ProtectedRoute />}>
            <Route index element={<div>Conteúdo protegido</div>} />
          </Route>
          <Route path="/signin" element={<div>Página de login</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Página de login")).toBeInTheDocument();
  });

  it("renderiza el contenido cuando hay token", () => {
    localStorage.setItem("token", "mock-token");

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<ProtectedRoute />}>
            <Route index element={<div>Conteúdo protegido</div>} />
          </Route>
          <Route path="/signin" element={<div>Página de login</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
  });
});
