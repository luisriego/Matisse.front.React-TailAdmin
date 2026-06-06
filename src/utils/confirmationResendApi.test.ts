import { describe, it, expect, vi } from "vitest";
import {
  CONFIRMATION_RESEND_DEFAULT_MESSAGE,
  resendConfirmationEmail,
} from "./confirmationResendApi";

describe("resendConfirmationEmail", () => {
  it("devolve mensagem do corpo em 200", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ message: CONFIRMATION_RESEND_DEFAULT_MESSAGE }),
        { status: 200 },
      ),
    ) as typeof fetch;

    const msg = await resendConfirmationEmail(" user@example.com ");
    expect(msg).toBe(CONFIRMATION_RESEND_DEFAULT_MESSAGE);
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/users/confirmation-resend",
      expect.objectContaining({
        body: JSON.stringify({ email: "user@example.com" }), // normalizado a minúsculas
      }),
    );
  });

  it("lança erro em respostas não OK", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ message: "Erro interno" }), {
        status: 500,
      }),
    ) as typeof fetch;

    await expect(resendConfirmationEmail("a@b.com")).rejects.toThrow(
      /Erro interno|reenviar/i,
    );
  });
});
