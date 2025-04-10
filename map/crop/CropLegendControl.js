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
    this.mapping = options.mapping || {};
    this.legendItems = [];
    this.render();
    this.tileLoadEnd = this.tileLoadEnd.bind(this);
    this.changeSource = this.changeSource.bind(this);
    this.updateFeatureCount = debounce(this.updateFeatureCount, 1000).bind(this);
  }
  updateFeatureCount(e) {
    const map = this.getMap();
    const vectortiles = map.getLayers().getArray().filter(f => f instanceof VectorTile);
    const extent = map.getView().calculateExtentInternal();
    let totalArea = 0, count = 0, cropArea = {}, cropCount = {};
    for (const vt of vectortiles) {
      forFeaturesInExtent(vt, extent, (feature) => {
          const area = feature.properties_["area"] || toGeometry(feature).getArea();
          const crop = feature.properties_[this.attribute];
          count++;
          totalArea += area;
          cropCount[crop] = (cropCount[crop] || 0) + 1;
          cropArea[crop] = (cropArea[crop] || 0) + area;
      });
    }
    const topCrops = Object.entries(cropArea)
      .map(([crop, area]) => ({ crop, area }))
      .sort((a, b) => b.area - a.area) // Descending order
      .slice(0, 5);

    this.legendItems = topCrops.map(({crop, area}) =>
      {
        const c = this.mapping[crop];
        const percent = (area / totalArea) * 100;
        return {
          label: c.name.replaceAll("_", " "),
          color: c.color || "#99bbccaa",
          percent: percent.toFixed(2) + "%",
          area: area.toFixed(2),
        }
      }
    )
    this.render();
  }

  tileLoadEnd(e) {
    const features = e.tile.getFeatures();
    for (const feature of features) {
      const p = feature.getProperties();
      p.color = this.mapping[p[this.attribute]]?.color || "#99bbccaa";
    }
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
    const element = this.element;
    element.innerHTML = ''; // Clear previous content

    const legendTitle = document.createElement('div');
    legendTitle.className = 'legend-title';
    legendTitle.innerText = 'Legend';
    element.appendChild(legendTitle);

    const list = document.createElement('ul');
    list.className = 'legend-list';

    this.legendItems.forEach((item) => {
      const listItem = document.createElement('li');
      const colorBox = document.createElement('span');
      const text = document.createElement('span');

      colorBox.className = 'legend-color';
      colorBox.style.backgroundColor = item.color;

      text.className = 'legend-text';
      text.innerText = item.label;

      listItem.appendChild(colorBox);
      listItem.appendChild(text);

      list.appendChild(listItem);
    });

    element.appendChild(list);
  }

}
