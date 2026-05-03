import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import GasConsumptionCard from "../components/gas/GasConsumptionCard";

describe("GasConsumptionCard", () => {
  it("interpreta '1.281,343' en formato pt-BR y calcula consumo correcto", () => {
    render(
      <GasConsumptionCard
        residentUnits={[{ id: "u1", unit: "Apto 501" }]}
        gasReadings={[
          {
            residentUnitId: "u1",
            unit: "Apto 501",
            previousReading: 1278.829,
            currentReading: "1.281,343",
          },
        ]}
        gasUnitPrice="26,00"
        onOpenGasModal={vi.fn()}
      />,
    );

    expect(screen.getByText("1.281,343")).toBeInTheDocument();
    expect(screen.getByText("2,514 m³")).toBeInTheDocument();
  });
});
