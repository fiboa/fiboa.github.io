import Control from 'ol/control/Control';
import VectorTile from 'ol/layer/VectorTile';
import {toGeometry} from "ol/render/Feature";
import TileState from "ol/TileState";
import {intersects} from "ol/extent";
import debounce from "lodash.debounce";

function forFeaturesInExtent(vt, extent, callback) {
  const renderer = vt.getRenderer();
  const tileCache = renderer.getTileCache();
  if (tileCache.getCount() === 0) return;

  const tileGrid = renderer.getLayer().getSource().tileGrid;
  const z = tileGrid.getZForResolution(renderer.renderedResolution);
  tileCache.forEach((tile) => {
    if (tile.tileCoord[0] !== z || tile.getState() !== TileState.LOADED) return;
    for (const sourceTile of tile.getSourceTiles()) {
      const tileCoord = sourceTile.tileCoord;
      if (intersects(extent, tileGrid.getTileCoordExtent(tileCoord))) {
        for (const candidate of  sourceTile.getFeatures()) {
          if (intersects(extent, candidate.getExtent())) callback(candidate);
        }
      }
    }
  });
}

/**
 * A custom Legend Control for OpenLayers
 * Displays a legend on the map with custom items
 */
export class CropLegendControl extends Control {
  constructor(options = {}) {
    const element = document.createElement('div');
    element.className = 'ol-crop-legend ol-unselectable ol-control';

    super({
      element: element,
      target: options.target,
    });

    this.attribute = options.attribute;
    this.mapping = options.mapping || [];
    this.legendItems = [];
    this.level = this.mapping.length - 1;
    this.render();
    this.tileLoadEnd = this.tileLoadEnd.bind(this);
    this.changeSource = this.changeSource.bind(this);
    this.updateFeatureCount = debounce(this.updateFeatureCount, 1000).bind(this);
  }
  updateFeatureCount(e) {
    const map = this.getMap();
    const mapping = this.mapping[this.level];
    const vectorTiles = map.getLayers().getArray().filter(f => f instanceof VectorTile);
    const extent = map.getView().calculateExtentInternal();
    let totalArea = 0, count = 0, cropArea = {}, cropCount = {}, byName = {};
    for (const vt of vectorTiles) {
      forFeaturesInExtent(vt, extent, (feature) => {
          const area = feature.properties_["area"] || toGeometry(feature).getArea();
          const crop = feature.properties_[this.attribute];
          const name = mapping[crop]?.name;
          if (!name) return;
          if (!byName[name]) byName[name] = mapping[crop];
          count++;
          totalArea += area;
          cropCount[name] = (cropCount[name] || 0) + 1;
          cropArea[name] = (cropArea[name] || 0) + area;
      });
    }
    const topCrops = Object.entries(cropArea)
      .map(([name, area]) => ({ name, area }))
      .sort((a, b) => b.area - a.area) // Descending order
      .slice(0, 5);

    this.legendItems = topCrops.map(({name, area}) =>
      {
        const c = byName[name];
        const percent = (area / totalArea) * 100;
        return {
          label: c.name.replaceAll("_", " "),
          color: c.color || "#99bbccaa",
          percent: percent >= 1 ? percent.toFixed(0) + "%" : "<1%",
          area: area.toFixed(2),
        }
      }
    )
    this.render();
  }

  updateColors(tile) {
    const features = tile.getFeatures();
    const m = this.mapping.at(this.level);
    for (const feature of features) {
      const p = feature.getProperties();
      p.color = m[p[this.attribute]]?.color || "#99bbccaa";
    }
  }

  tileLoadEnd(e) {
    this.updateColors(e.tile)
    this.updateFeatureCount(e)
  }

  changeSource(e) {
    if (!(e.element instanceof VectorTile)) return;
    if (e.type === "add") {
      e.element.getSource().on('tileloadend', this.tileLoadEnd);
    } else {
      e.element.getSource().un('tileloadend', this.tileLoadEnd);
    }
  }

  setMap(map) {
    super.setMap(map);
    const layers = map.getLayers();
    if (map) {
      map.on("moveend", this.updateFeatureCount);
      layers.on(["add", "remove"], this.changeSource)
    } else {
      map.un("moveend", this.updateFeatureCount);
      layers.un(["add", "remove"], this.changeSource)
    }
  }
  render() {
    const map = this.getMap();
    const element = this.element;
    if (!this.legendItems?.length) {
       element.innerHTML = "";
       return;
    }
    let levels = "";
    if (this.mapping.length) {
      levels = `<span style="font-weight: normal">Hcat level: </span>`;
      for (let i = 0; i < this.mapping.length; i++) {
        levels += `<button class="legend-level${i===this.level?" active":""}">${i}</button>`;
      }
      levels = `<div style="float:right;">${levels}</div>`;
    }
    element.innerHTML = `
      <div class="legend-title">Legend ${levels}</div>
      ${this.legendItems.map(({color, label, percent}) => `
        <ul class="legend-list">
          <li>
            <span class="legend-color" style="background-color: ${color};"></span>
            <span class="legend-text">${label} ${percent}</span>
          </li>
        </ul>
      `).join("")}
    `;
    this.element.querySelectorAll(".legend-level").forEach(e => e.addEventListener("click", (e) => {
      this.level = parseInt(e.target.innerText);
      for (const vt of map.getLayers().getArray()) {
        let changed = false;
        if (vt instanceof VectorTile) {
          vt.getRenderer().getTileCache().forEach((tile) => {
            if (tile.getState() !== TileState.LOADED) return;
            for (const sourceTile of tile.getSourceTiles()) {
              this.updateColors(sourceTile)
              changed = true;
            }
          })
        }
        if (changed) vt.changed();
      }
      this.updateFeatureCount();
    }))
  }

}
