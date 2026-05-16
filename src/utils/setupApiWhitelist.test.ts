import { describe, expect, it } from "vitest";
import { isSetupApiWhitelistPath } from "./setupApi";

describe("isSetupApiWhitelistPath", () => {
  it("permite OFX/extratos e catálogo do modal de importação", () => {
    expect(isSetupApiWhitelistPath("/api/v1/bank/ofx-ingest")).toBe(true);
    expect(isSetupApiWhitelistPath("/api/v1/bank/ofx-confirm")).toBe(true);
    expect(isSetupApiWhitelistPath("/api/v1/bank/ofx-matching-context")).toBe(
      true,
    );
    expect(isSetupApiWhitelistPath("/api/v1/accounts")).toBe(true);
    expect(isSetupApiWhitelistPath("/api/v1/accounts/abc/balance")).toBe(true);
    expect(isSetupApiWhitelistPath("/api/v1/expense-types")).toBe(true);
    expect(isSetupApiWhitelistPath("/api/v1/income-types")).toBe(true);
  });

  it("não trata rutas arbitrárias como whitelisted", () => {
    expect(isSetupApiWhitelistPath("/api/v1/expenses")).toBe(false);
  });
});
