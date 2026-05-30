import { describe, expect, it } from "vitest";
import type { JwtPayload } from "jwt-decode";
import {
  decodedTokenHasResidentialUnit,
  jwtPayloadUserApiId,
  clearSetupUnitBypass,
  SETUP_UNIT_BYPASS_STORAGE_KEY,
  setSetupUnitBypass,
} from "./jwtResidentialUnit";

describe("decodedTokenHasResidentialUnit", () => {
  const base = { exp: 4102444800 } as JwtPayload & Record<string, unknown>;

  it("não marca como ligado apenas com campo escalar «unit» (evita JWT ambíguo)", () => {
    expect(decodedTokenHasResidentialUnit({ ...base, unit: "101" })).toBe(false);
    expect(decodedTokenHasResidentialUnit({ ...base, unit: "ADMIN" })).toBe(false);
  });

  it("recusa valores escalar espúrios em «unit»", () => {
    expect(decodedTokenHasResidentialUnit({ ...base, unit: null })).toBe(false);
    expect(decodedTokenHasResidentialUnit({ ...base, unit: "" })).toBe(false);
    expect(decodedTokenHasResidentialUnit({ ...base, unit: "null" })).toBe(false);
    expect(decodedTokenHasResidentialUnit({ ...base, unit: "undefined" })).toBe(false);
  });

  it("aceita residentUnitId", () => {
    expect(
      decodedTokenHasResidentialUnit({
        ...base,
        residentUnitId: "e4b8b3f0-6b7a-4f2a-8b8b-3b3b3b3b3b3e",
      }),
    ).toBe(true);
  });

  it("aceita objeto resident_unit com id", () => {
    expect(
      decodedTokenHasResidentialUnit({
        ...base,
        resident_unit: { id: "abc", unit: "" },
      }),
    ).toBe(true);
  });
});

describe("jwtPayloadUserApiId", () => {
  const base = { exp: 4102444800 } as JwtPayload & Record<string, unknown>;

  it("prefere userId / user_id", () => {
    expect(
      jwtPayloadUserApiId({
        ...base,
        userId: "a1",
        sub: "b2",
      }),
    ).toBe("a1");
    expect(
      jwtPayloadUserApiId({
        ...base,
        user_id: "c3",
      }),
    ).toBe("c3");
  });

  it("aceita sub numérico", () => {
    expect(
      jwtPayloadUserApiId({
        ...(base as unknown as JwtPayload),
        sub: 42,
      } as unknown as JwtPayload & Record<string, unknown>),
    ).toBe("42");
  });
});

describe("clearSetupUnitBypass / setSetupUnitBypass (legacy UX)", () => {
  it("clearSetupUnitBypass limpa storages relacionados ao bypass legacy", () => {
    localStorage.setItem(SETUP_UNIT_BYPASS_STORAGE_KEY, "1");
    sessionStorage.setItem(SETUP_UNIT_BYPASS_STORAGE_KEY, "1");
    clearSetupUnitBypass();
    expect(localStorage.getItem(SETUP_UNIT_BYPASS_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(SETUP_UNIT_BYPASS_STORAGE_KEY)).toBeNull();
  });

  it("setSetupUnitBypass marca sessionStorage", () => {
    sessionStorage.clear();
    setSetupUnitBypass();
    expect(sessionStorage.getItem(SETUP_UNIT_BYPASS_STORAGE_KEY)).toBe("1");
  });
});
