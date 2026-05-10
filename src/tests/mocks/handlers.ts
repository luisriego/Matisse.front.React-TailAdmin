import { http, HttpResponse } from "msw";
import { jwtFromPayload } from "./mockJwt";

const loginJwt = jwtFromPayload({ exp: 4102444800, id: "u1", sub: "u1" });

const setupCompletePayload = () => ({
  complete: true,
  currentStep: 0,
  steps: {
    initialBalances: true,

    gasPrice: true,

    gasReadings: true,

    initialExpenses: true,

    openingReferenceMonth: true,

  },

  message: "",
});

export const handlers = [
  http.get("/api/v1/resident-unit/actives", () => HttpResponse.json([])),

  http.put("/api/v1/resident-unit/create", () =>
    HttpResponse.json({ status: "created" }, { status: 201 }),
  ),

  http.put("/api/v1/accounts/create", () =>
    HttpResponse.json({ status: "created" }, { status: 201 }),
  ),

  http.get("/api/v1/accounts", () =>
    HttpResponse.json({ accounts: [] }),
  ),

  http.put("/api/v1/gas/price", () =>
    HttpResponse.json({ status: "created" }, { status: 201 }),

  ),

  http.put("/api/v1/gas/price/direct", () =>
    HttpResponse.json({ status: "created" }, { status: 201 }),
  ),

  http.get("/api/v1/gas/price", () =>
    HttpResponse.json(
      { message: "O preço do gás ainda não foi definido." },
      { status: 404 },
    ),
  ),

  http.get("/api/v1/setup/status", () =>
    HttpResponse.json({ data: setupCompletePayload() }),

  ),

  http.post("/api/v1/setup/initial-balances/preview", () =>
    HttpResponse.json({ data: {} }),
  ),

  http.post("/api/v1/setup/initial-balances/confirm", () =>
    HttpResponse.json({ ok: true }),
  ),

  http.post("/api/v1/setup/opening-reference-month", () =>
    HttpResponse.json({ recorded: true }, { status: 201 }),
  ),

  http.post("/api/v1/login_check", () =>
    HttpResponse.json({ token: loginJwt }),

  ),

];
