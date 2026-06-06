import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ResendConfirmationForm from "../components/auth/ResendConfirmationForm";
import { CONFIRMATION_RESEND_DEFAULT_MESSAGE } from "../utils/confirmationResendApi";
import {
  clearPendingConfirmationEmail,
  setPendingConfirmationEmail,
} from "../utils/pendingConfirmationEmail";

function renderForm() {
  return render(
    <MemoryRouter initialEntries={["/confirmation-resend"]}>
      <Routes>
        <Route
          path="/confirmation-resend"
          element={<ResendConfirmationForm />}
        />
        <Route path="/signup" element={<div>Cadastro page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ResendConfirmationForm", () => {
  beforeEach(() => {
    clearPendingConfirmationEmail();
    vi.restoreAllMocks();
  });

  it("sem sessão de cadastro não permite introduzir e-mail arbitrário", () => {
    renderForm();
    expect(screen.getByText(/O reenvio só é possível para o e-mail da sua conta/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Digite seu e-mail/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ir para cadastro/i })).toBeInTheDocument();
  });

  it("com e-mail da sessão mostra-o fixo e reenvia só para esse endereço", async () => {
    setPendingConfirmationEmail("joao@example.com");
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ message: CONFIRMATION_RESEND_DEFAULT_MESSAGE }),
        { status: 200 },
      ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    renderForm();
    expect(screen.getByText("joao@example.com")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Reenviar e-mail de confirmação/i }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/users/confirmation-resend",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "joao@example.com" }),
        }),
      );
      expect(
        screen.getByText(CONFIRMATION_RESEND_DEFAULT_MESSAGE),
      ).toBeInTheDocument();
    });
  });
});
