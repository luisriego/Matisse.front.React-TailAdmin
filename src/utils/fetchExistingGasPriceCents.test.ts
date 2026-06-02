import { describe, expect, it, vi } from "vitest";
import { fetchExistingGasPriceCents } from "./fetchExistingGasPriceCents";

describe("fetchExistingGasPriceCents", () => {
  it("extrai snake_case do JSON directo", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          price_per_m3_in_cents: 2600,
        }),
    });
    await expect(fetchExistingGasPriceCents("t")).resolves.toBe(2600);
  });

  it("extrai camelCase e envelope data", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { pricePerM3InCents: 587 },
        }),
    });
    await expect(fetchExistingGasPriceCents("t")).resolves.toBe(587);
  });

  it("404 devolve null", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });
    await expect(fetchExistingGasPriceCents("t")).resolves.toBe(null);
  });
});
