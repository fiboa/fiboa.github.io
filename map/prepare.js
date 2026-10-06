import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const CATALOG = "https://data.source.coop/ftw/harmonized-field-data/catalog.json";
const HCAT_EXTENSION = "https://fiboa.org/hcat-extension/";
const BROWSE = "https://source.coop/ftw/harmonized-field-data/";

export function toSource(collection, collectionUrl) {
  const pmtiles = collection.links.find(l => l.rel === "pmtiles");
  const extensions = Object.values(collection.vecorel_extensions ?? {}).flat();
  return {
    id: collection.id,
    title: (collection.title || collection.id).replace("Field boundaries for ", ""),
    boundaries: collection.boundaries,
    attribution: collection.attribution,
    bbox: collection.extent.spatial.bbox,
    count: collection["table:row_count"] ?? 0,
    pmtiles: pmtiles && new URL(pmtiles.href, collectionUrl).href,
    layer: pmtiles?.["pmtiles:layers"]?.[0] ?? collection.id,
    crops: extensions.some(e => e.startsWith(HCAT_EXTENSION)),
    url: BROWSE + collection.id,
  };
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function prepare() {
  const catalog = await fetchJson(CATALOG);
  const urls = catalog.links
    .filter(link => link.rel === "child")
    .map(link => new URL(link.href, CATALOG).href);
  const sources = [];
  await Promise.all(urls.map(async url => {
    try {
      sources.push(toSource(await fetchJson(url), url));
    } catch (error) {
      console.error(`Failed to load ${url}: ${error}`);
    }
  }));
  sources.sort((a, b) => a.title.localeCompare(b.title));
  fs.writeFileSync("sources.js", `export default ${JSON.stringify(sources, null, 2)}\n`);
  console.log(`Wrote ${sources.length} collections to sources.js`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await prepare();
}
