import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SetPasswordForm from "../components/auth/SetPasswordForm";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/set-password/:userId/:token" element={<SetPasswordForm />} />
        <Route path="/signin" element={<div>SignIn page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SetPasswordForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("mostra erro se userId está em branco", () => {
    renderAt("/set-password/%20/reset-token");
    expect(screen.getByText(/Link inválido/i)).toBeInTheDocument();
  });

  it("envia senha e redireciona para signin com message=password_set", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          message:
            "Sua senha foi redefinida com sucesso. Você já pode fazer login.",
        }),
        { status: 200 },
      ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    renderAt("/set-password/user-uuid/reset-token-abc");

    fireEvent.change(screen.getByPlaceholderText(/Mínimo 6/i), {
      target: { value: "senha123" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Repita a senha/i), {
      target: { value: "senha123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Definir senha/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/users/user-uuid/password-reset/reset-token-abc",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ newPassword: "senha123" }),
        }),
      );
      expect(screen.getByText(/SignIn page/i)).toBeInTheDocument();
    });
  });
});
