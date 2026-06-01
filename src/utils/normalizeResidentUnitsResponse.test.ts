import { describe, expect, it } from "vitest";
import {
  coerceResidentUnitsArray,
  mapResidentUnitsFromRaw,
  residentUnitApiId,
} from "./normalizeResidentUnitsResponse";

describe("coerceResidentUnitsArray", () => {
  it("aceita lista directa", () => {
    expect(coerceResidentUnitsArray([{ id: "1" }])).toHaveLength(1);

  });


  it("desembrulha Symfony { data: [...] }", () => {


    expect(coerceResidentUnitsArray({ data: [{ id: "a" }] })).toHaveLength(1);


  });


  it("desembrulha Spring page { content: [...] }", () => {


    expect(coerceResidentUnitsArray({ content: [{ id: "b" }] })).toHaveLength(


      1,


    );


  });


});


describe("mapResidentUnitsFromRaw", () => {
  it("mapeia campos Symfony (id, unit, idealFraction, isActive, …)", () => {
    const rows = mapResidentUnitsFromRaw({
      data: [
        {
          id: "uuid-1",
          unit: "Apto 201",
          idealFraction: 0.2576,
          isActive: true,
          createdAt: "2024-01-01 10:00:00",
          updatedAt: null,
          notificationRecipients: [{ name: "Ana", email: "ana@test.com" }],
        },
        { uuid: "uuid-2", unit_name: "Apto 301", ideal_fraction: "0.1813" },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: "uuid-1",
      unit: "Apto 201",
      idealFraction: 0.2576,
      isActive: true,
      createdAt: "2024-01-01 10:00:00",
    });
    expect(rows[0]?.notificationRecipients).toEqual([
      { name: "Ana", email: "ana@test.com" },
    ]);
    expect(rows[1]?.unit).toBe("Apto 301");
    expect(rows[1]?.idealFraction).toBe(0.1813);
  });
});

describe("residentUnitApiId", () => {


  it("lê vários aliases", () => {


    expect(residentUnitApiId({ uuid: "x1" })).toBe("x1");


    expect(residentUnitApiId({ resident_unit_id: "y2" })).toBe("y2");


  });

  it("extrai UUID de @id tipo API Platform", () => {
    expect(
      residentUnitApiId({
        "@id": "/api/v1/residential_units/a0000001-0000-4000-8000-000000000001",
        unit: "Apto 501",
      }),
    ).toBe("a0000001-0000-4000-8000-000000000001");
  });


});
