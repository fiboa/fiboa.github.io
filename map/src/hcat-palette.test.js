import { expect, test } from "vitest";
import { createExpression } from "@maplibre/maplibre-gl-style-spec";
import { FALLBACK_COLOR, cropAt, hcat, levelColorExpression } from "./hcat-palette.js";

const colorOf = code => hcat.find(c => c.code === code).color;

function evaluate(level, hcatCode) {
  const result = createExpression(levelColorExpression(level), "layers[0].paint.fill-color");
  expect(result.result).toBe("success");
  return result.value.evaluate({ zoom: 10 }, { properties: { "hcat:code": hcatCode } });
}

test("level 0 colours a winter wheat field as arable crops", () => {
  expect(evaluate(0, 3301010101)).toBe(colorOf("3301000000"));
  expect(cropAt(3301010101, 0).name).toBe("arable_crops");
});

test("level 3 colours a field by its own code", () => {
  expect(evaluate(3, 3301010101)).toBe(colorOf("3301010101"));
});

test("an unknown or missing code gets the fallback colour", () => {
  expect(evaluate(3, 1234567890)).toBe(FALLBACK_COLOR);
  expect(evaluate(1, undefined)).toBe(FALLBACK_COLOR);
  expect(cropAt(1234567890, 3)).toBeUndefined();
});
