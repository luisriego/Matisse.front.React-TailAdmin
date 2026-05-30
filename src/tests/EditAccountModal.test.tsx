import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EditAccountModal from "../components/modal/EditAccountModal";
import type { Account } from "../types/accountApi";

describe("EditAccountModal", () => {
  const originalFetch = globalThis.fetch;

  const account: Account = {
    id: "acc-uuid-1",
    name: "Conta Principal",
    description: "Uso interno",
    isActive: true,
    balance: 0,
  };

  beforeEach(() => {
    localStorage.setItem("token", "mock-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
    localStorage.clear();
  });

  it("PATCH envia só name e description (sem code)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const onUpdate = vi.fn();
    render(
      <EditAccountModal
        isOpen={true}
        onClose={() => {}}
        account={account}
        onAccountUpdate={onUpdate}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("Conta Principal"), {
      target: { value: "Conta Principal II" },
    });
    fireEvent.change(screen.getByDisplayValue("Uso interno"), {
      target: { value: "Atualizado" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Salvar Alterações/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/accounts/acc-uuid-1",
      expect.objectContaining({
        method: "PATCH",
      }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      name: "Conta Principal II",
      description: "Atualizado",
    });
    expect(onUpdate).toHaveBeenCalled();
  });
});
