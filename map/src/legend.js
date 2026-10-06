import { FALLBACK_COLOR, HCAT_LEVELS, cropAt } from "./hcat-palette.js";

const EARTH_RADIUS = 6378137;
const TOP = 5;

// Spherical polygon area in m², for datasets without metrics:area.
function ringArea(ring) {
  const rad = Math.PI / 180;
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += (x2 - x1) * rad * (2 + Math.sin(y1 * rad) + Math.sin(y2 * rad));
  }
  return Math.abs((area * EARTH_RADIUS * EARTH_RADIUS) / 2);
}

function geometryArea(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.reduce(
    (sum, [outer, ...holes]) => sum + ringArea(outer) - holes.reduce((h, ring) => h + ringArea(ring), 0),
    0,
  );
}

export class CropLegend {
  constructor({ layers, level, onLevel }) {
    this.layers = layers;
    this.level = level;
    this.onLevel = onLevel;
    this.update = this.update.bind(this);
  }

  onAdd(map) {
    this.map = map;
    this.element = document.createElement("div");
    this.element.className = "maplibregl-ctrl crop-legend";
    this.element.addEventListener("click", e => {
      if (!e.target.dataset.level) return;
      this.level = Number(e.target.dataset.level);
      this.onLevel(this.level);
    });
    map.on("idle", this.update);
    this.update();
    return this.element;
  }

  onRemove() {
    this.map.off("idle", this.update);
    this.element.remove();
    this.map = undefined;
  }

  topCrops() {
    const layers = this.layers().filter(id => this.map.getLayer(id));
    const seen = new Set();
    const areas = new Map();
    let total = 0;
    for (const feature of this.map.queryRenderedFeatures({ layers })) {
      if (feature.properties.id !== undefined) {
        const key = `${feature.source}:${feature.properties.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
      }
      const crop = cropAt(feature.properties["hcat:code"], this.level);
      if (!crop) continue;
      const area = feature.properties["metrics:area"] ?? geometryArea(feature.geometry);
      total += area;
      areas.set(crop, (areas.get(crop) ?? 0) + area);
    }
    return [...areas]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP)
      .map(([crop, area]) => ({ crop, percent: (area / total) * 100 }));
  }

  update() {
    if (!this.map) return;
    const crops = this.topCrops();
    const levels = HCAT_LEVELS.map(
      (_, i) => `<button type="button" data-level="${i}" class="${i === this.level ? "active" : ""}">${i}</button>`,
    ).join("");
    const items = crops.map(({ crop, percent }) => `
      <li>
        <span class="swatch" style="background-color: ${crop.color || FALLBACK_COLOR}"></span>
        ${crop.name.replaceAll("_", " ")} ${percent >= 1 ? percent.toFixed(0) + "%" : "&lt;1%"}
      </li>`).join("");
    this.element.innerHTML = `
      <div class="legend-title">Crops in view <span class="levels">HCAT level ${levels}</span></div>
      ${items ? `<ul>${items}</ul>` : `<p class="empty">Zoom in on a dataset with crops</p>`}`;
  }
}
