import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchActiveResidentUnits } from "./fetchActiveResidentUnits";

describe("fetchActiveResidentUnits", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parseia array directo de GET /api/v1/resident-unit/actives", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: "u1",
            unit: "Apto 201",
            idealFraction: 0.2576,
            isActive: true,
            createdAt: "2024-01-01 10:00:00",
            updatedAt: null,
            notificationRecipients: [],
          },
          {
            id: "u2",
            unit: "Apto 301",
            idealFraction: 0.1813,
            isActive: true,
            createdAt: "2024-01-01 10:00:00",
            updatedAt: "2024-01-02 10:00:00",
            notificationRecipients: [{ name: "João", email: "joao@example.com" }],
          },
        ],
      }),
    );

    const rows = await fetchActiveResidentUnits("token-test");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: "u1",
      unit: "Apto 201",
      idealFraction: 0.2576,
      isActive: true,
    });
    expect(rows[1]?.notificationRecipients).toEqual([
      { name: "João", email: "joao@example.com" },
    ]);
  });

  it("lança erro quando actives falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ message: "SETUP_REQUIRED" }),
        text: async () => "",
      }),
    );

    await expect(fetchActiveResidentUnits("t")).rejects.toThrow("SETUP_REQUIRED");
  });
});
