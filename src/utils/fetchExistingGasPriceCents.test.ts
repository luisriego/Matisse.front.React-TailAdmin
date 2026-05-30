import { describe, expect, it } from "vitest";
import { fetchExistingGasPriceCents } from "./fetchExistingGasPriceCents";

describe("fetchExistingGasPriceCents", () => {
  it("extrai snake_case do JSON directo", async () => {
    global.fetch = (): Promise<Response> =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            price_per_m3_in_cents: 2600,
          }),
      }) as unknown as Response;
    await expect(fetchExistingGasPriceCents("t")).resolves.toBe(2600);
  });

  it("extrai camelCase e envelope data", async () => {
    global.fetch = (): Promise<Response> =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { pricePerM3InCents: 587 },
          }),
      }) as unknown as Response;
    await expect(fetchExistingGasPriceCents("t")).resolves.toBe(587);
  });

  it("404 devolve null", async () => {
    global.fetch = (): Promise<Response> =>
      Promise.resolve({
        ok: false,
        status: 404,
      }) as unknown as Response;
    await expect(fetchExistingGasPriceCents("t")).resolves.toBe(null);
  });
});
