import "maplibre-gl/dist/maplibre-gl.css";
import "../style.css";
import { AttributionControl, Map, NavigationControl, addProtocol, setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { Protocol } from "pmtiles";
import collections from "../sources.js";
import { levelColorExpression } from "./hcat-palette.js";
import { CropLegend } from "./legend.js";
import { showPopup } from "./popup.js";

const FIELD_MIN_ZOOM = 7;
const FIELD_COLOR = "rgb(0, 165, 255)";

// The bundle moves maplibre-gl, so it cannot find its worker next to itself.
setWorkerUrl(workerUrl);
addProtocol("pmtiles", new Protocol().tile);

const visible = collections.filter(c => c.pmtiles);
const state = {
  crop: new URLSearchParams(location.search).has("crop"),
  level: 3,
};

const map = new Map({
  container: "map",
  hash: true,
  attributionControl: false,
  center: [0, 20],
  zoom: 1,
  style: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
      bboxes: { type: "geojson", data: bboxFeatures() },
    },
    layers: [
      { id: "osm", type: "raster", source: "osm" },
      {
        id: "bbox-fill",
        type: "fill",
        source: "bboxes",
        maxzoom: FIELD_MIN_ZOOM,
        paint: { "fill-color": "rgba(0, 0, 0, 0.1)" },
      },
      {
        id: "bbox-line",
        type: "line",
        source: "bboxes",
        maxzoom: FIELD_MIN_ZOOM,
        paint: { "line-color": ["case", ["get", "visual"], "#000", "#f00"], "line-width": 1 },
      },
    ],
  },
});
map.addControl(new NavigationControl({ showCompass: false }), "top-right");
map.addControl(new AttributionControl({ compact: true }), "bottom-right");

// Compact attribution opens as soon as it gets its first source; collapse it at that moment.
function collapseAttribution() {
  const attribution = map.getContainer().querySelector(".maplibregl-ctrl-attrib");
  if (!attribution.classList.contains("maplibregl-compact")) return;
  attribution.classList.remove("maplibregl-compact-show");
  map.off("styledata", collapseAttribution);
  map.off("sourcedata", collapseAttribution);
}
map.on("styledata", collapseAttribution);
map.on("sourcedata", collapseAttribution);

const legend = new CropLegend({
  layers: () => visible.filter(c => c.crops).map(c => `${c.id}-fill`),
  level: state.level,
  onLevel: level => {
    state.level = level;
    applyMode();
  },
});

map.once("style.load", () => {
  for (const c of visible) {
    map.addSource(c.id, { type: "vector", url: `pmtiles://${c.pmtiles}`, attribution: c.attribution });
    map.addLayer({ id: `${c.id}-fill`, type: "fill", source: c.id, "source-layer": c.layer, minzoom: FIELD_MIN_ZOOM });
    map.addLayer({ id: `${c.id}-line`, type: "line", source: c.id, "source-layer": c.layer, minzoom: FIELD_MIN_ZOOM });
  }
  applyMode();
  map.on("moveend", updateView);
  document.getElementById("crop-toggle").addEventListener("click", () => {
    state.crop = !state.crop;
    history.replaceState(null, "", (state.crop ? "?crop" : location.pathname) + location.hash);
    applyMode();
  });
});

function bboxFeatures(onlyCrops = false) {
  const features = collections
    .filter(c => !onlyCrops || c.crops)
    .flatMap(c => (c.bbox.length > 1 ? c.bbox.slice(1) : c.bbox).map(([w, s, e, n]) => ({
      type: "Feature",
      properties: { id: c.id, visual: Boolean(c.pmtiles) },
      geometry: { type: "Polygon", coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] },
    })));
  return { type: "FeatureCollection", features };
}

// Hiding datasets out of view also keeps their attribution out of the attribution control.
function updateView() {
  const bounds = map.getBounds();
  for (const c of visible) {
    const [w, s, e, n] = c.bbox[0];
    const inView = bounds.getWest() <= e && w <= bounds.getEast() && bounds.getSouth() <= n && s <= bounds.getNorth();
    const visibility = inView && (!state.crop || c.crops) ? "visible" : "none";
    map.setLayoutProperty(`${c.id}-fill`, "visibility", visibility);
    map.setLayoutProperty(`${c.id}-line`, "visibility", visibility);
  }
  document.getElementById("hint").style.display = map.getZoom() < FIELD_MIN_ZOOM ? "block" : "none";
}

function applyMode() {
  updateView();
  const fieldColor = state.crop ? levelColorExpression(state.level) : FIELD_COLOR;
  for (const c of visible) {
    map.setPaintProperty(`${c.id}-fill`, "fill-color", fieldColor);
    map.setPaintProperty(`${c.id}-fill`, "fill-opacity", state.crop ? 0.8 : 0.1);
    map.setPaintProperty(`${c.id}-line`, "line-color", state.crop ? "rgba(88, 88, 88, 0.5)" : FIELD_COLOR);
    map.setPaintProperty(`${c.id}-line`, "line-width", state.crop ? 0.5 : 1);
  }
  map.getSource("bboxes").setData(bboxFeatures(state.crop));

  if (state.crop && !map.hasControl(legend)) map.addControl(legend, "bottom-right");
  if (!state.crop && map.hasControl(legend)) map.removeControl(legend);

  const shown = collections.filter(c => !state.crop || c.crops);
  document.getElementById("count").innerText = shown.reduce((sum, c) => sum + c.count, 0).toLocaleString();
  const toggle = document.getElementById("crop-toggle");
  toggle.setAttribute("aria-pressed", String(state.crop));
  toggle.innerText = state.crop ? "All datasets" : "With crops";
}

function interactiveLayers() {
  return ["bbox-fill", ...visible.map(c => `${c.id}-fill`)].filter(
    id => map.getLayer(id) && map.getLayoutProperty(id, "visibility") !== "none",
  );
}

map.on("click", e => {
  const features = map.queryRenderedFeatures(e.point, { layers: interactiveLayers() });
  showPopup(map, e.lngLat, features, collections);
});

map.on("mousemove", e => {
  const hit = map.queryRenderedFeatures(e.point, { layers: interactiveLayers() }).length > 0;
  map.getCanvas().style.cursor = hit ? "pointer" : "";
});