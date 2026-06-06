import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ResendConfirmationForm from "../components/auth/ResendConfirmationForm";
import { CONFIRMATION_RESEND_DEFAULT_MESSAGE } from "../utils/confirmationResendApi";

function renderForm(path = "/confirmation-resend") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/confirmation-resend"
          element={<ResendConfirmationForm />}
        />
        <Route path="/signin" element={<div>SignIn page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ResendConfirmationForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("preenche e-mail a partir do query param", () => {
    renderForm("/confirmation-resend?email=joao%40example.com");
    expect(screen.getByPlaceholderText(/Digite seu e-mail/i)).toHaveValue(
      "joao@example.com",
    );
  });

  it("mostra mensagem genérica da API em 200", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ message: CONFIRMATION_RESEND_DEFAULT_MESSAGE }),
        { status: 200 },
      ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    renderForm();
    fireEvent.change(screen.getByPlaceholderText(/Digite seu e-mail/i), {
      target: { value: "joao@example.com" },
    });
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
