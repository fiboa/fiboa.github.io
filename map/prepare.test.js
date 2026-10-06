import { expect, test } from "vitest";
import { toSource } from "./prepare.js";

const url = "https://data.source.coop/ftw/harmonized-field-data/nl/collection.json";
const collection = {
  id: "nl",
  title: "Field boundaries for The Netherlands",
  boundaries: "declared",
  "table:row_count": 1265023,
  extent: { spatial: { bbox: [[3.2, 50.7, 7.2, 53.5]] } },
  vecorel_extensions: { nl: ["https://fiboa.org/hcat-extension/v0.3.0/schema.yaml"] },
  links: [
    { rel: "item", href: "./year=2025/nl-2025.json" },
    { rel: "pmtiles", href: "./year=2026/nl-2026.pmtiles", "pmtiles:layers": ["nl"] },
  ],
};

test("resolves the latest-edition pmtiles against the collection URL", () => {
  const source = toSource(collection, url);
  expect(source.pmtiles).toBe(
    "https://data.source.coop/ftw/harmonized-field-data/nl/year=2026/nl-2026.pmtiles",
  );
  expect(source.layer).toBe("nl");
  expect(source.count).toBe(1265023);
  expect(source.title).toBe("The Netherlands");
});

test("has crops only with the hcat extension", () => {
  expect(toSource(collection, url).crops).toBe(true);
  expect(toSource({ ...collection, vecorel_extensions: { nl: [] } }, url).crops).toBe(false);
});
