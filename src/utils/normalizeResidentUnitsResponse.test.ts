import { describe, expect, it } from "vitest";
import {
  coerceResidentUnitsArray,
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
