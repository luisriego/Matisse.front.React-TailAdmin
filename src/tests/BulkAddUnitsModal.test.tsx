import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BulkAddUnitsModal from "../components/modal/BulkAddUnitsModal";

vi.stubGlobal("crypto", {
  randomUUID: () => "mock-uuid-1234",
});

function unitInputs(): HTMLInputElement[] {
  return screen.getAllByPlaceholderText(/Ex\.: Apto/i);
}

function fractionInputs(): HTMLInputElement[] {
  return screen.getAllByPlaceholderText("0,2576");
}

function emailInputs(): HTMLInputElement[] {
  return screen.getAllByPlaceholderText(/morador@exemplo/i);
}

describe("BulkAddUnitsModal Integration", () => {
  const onUnitsAddedMock = vi.fn();
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("token", "mock-token");
  });

  it("renders correctly when open", () => {
    render(
      <BulkAddUnitsModal
        isOpen={true}
        onClose={onCloseMock}
        onUnitsAdded={onUnitsAddedMock}
      />,
    );
    expect(screen.getByText(/Inicializar Edifício \(Em Massa\)/i)).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    const { container } = render(
      <BulkAddUnitsModal
        isOpen={false}
        onClose={onCloseMock}
        onUnitsAdded={onUnitsAddedMock}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows error if a unit exceeds 10 characters", async () => {
    render(
      <BulkAddUnitsModal
        isOpen={true}
        onClose={onCloseMock}
        onUnitsAdded={onUnitsAddedMock}
      />,
    );

    fireEvent.change(unitInputs()[0]!, {
      target: { value: "Apartamento" },
    });
    fireEvent.change(fractionInputs()[0]!, { target: { value: "1" } });

    fireEvent.click(screen.getByRole("button", { name: /Inicializar Edifício/i }));

    expect(await screen.findByText(/Máximo 10 caracteres/i)).toBeInTheDocument();
    expect(onUnitsAddedMock).not.toHaveBeenCalled();
  });

  it("submits successfully and calls callbacks on valid input", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/v1/resident-unit/actives")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url.includes("/api/v1/resident-unit")) {
        return new Response(JSON.stringify({ id: "u-new" }), { status: 201 });
      }
      return new Response("{}", { status: 404 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    render(
      <BulkAddUnitsModal
        isOpen={true}
        onClose={onCloseMock}
        onUnitsAdded={onUnitsAddedMock}
      />,
    );

    const units = unitInputs();
    fireEvent.change(units[0]!, { target: { value: "Apto 101" } });
    fireEvent.change(units[1]!, { target: { value: "Apto 102" } });
    fireEvent.change(emailInputs()[0]!, {
      target: { value: "a101@example.com" },
    });
    fireEvent.change(emailInputs()[1]!, {
      target: { value: "a102@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Repartir frações igualmente/i }));

    fireEvent.click(screen.getByRole("button", { name: /Inicializar Edifício/i }));

    await waitFor(() => {
      expect(onUnitsAddedMock).toHaveBeenCalledTimes(1);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });
});
