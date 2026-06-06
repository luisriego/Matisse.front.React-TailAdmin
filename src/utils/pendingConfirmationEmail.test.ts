import { describe, it, expect, beforeEach } from "vitest";
import {
  clearPendingConfirmationEmail,
  getPendingConfirmationEmail,
  setPendingConfirmationEmail,
} from "./pendingConfirmationEmail";

describe("pendingConfirmationEmail", () => {
  beforeEach(() => {
    clearPendingConfirmationEmail();
  });

  it("guarda e lê o e-mail da sessão", () => {
    setPendingConfirmationEmail("  a@b.com  ");
    expect(getPendingConfirmationEmail()).toBe("a@b.com");
  });

  it("limpa após clear", () => {
    setPendingConfirmationEmail("a@b.com");
    clearPendingConfirmationEmail();
    expect(getPendingConfirmationEmail()).toBeNull();
  });
});
