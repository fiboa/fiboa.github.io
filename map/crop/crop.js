import collections from '../sources'
import {FiboaMap} from "../map";
import {hcat} from "./codes";
import VectorTile from "ol/layer/VectorTile";
import {PMTilesVectorSource} from "ol-pmtiles";
const cropExtension = "https://fiboa.github.io/hcat-extension/v0.1.0/schema.yaml";
import debounce from "lodash.debounce";
import TileState from 'ol/TileState';
import {intersects} from "ol/extent";
import {toGeometry} from "ol/render/Feature";
import {CropLegendControl} from "./CropLegendControl";

const CROP_ATTRIBUTE = "ec:hcat_code";
const fieldStyle = {
  "stroke-color": 'rgb(88, 88, 88, 88)',
  "stroke-width": 0.5,
  "fill-color":  ['get', 'color']
}
const mapping = Object.fromEntries(hcat.map(c => [c.code, c.color]));

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

class CropMap extends FiboaMap {
  constructor() {
    super();
    this.fieldStyle = fieldStyle;
    this.vectortiles = [];
    this.updateFeatureCount = debounce(this.updateFeatureCount, 1000).bind(this);
    this.map.on("moveend", this.updateFeatureCount)
    this.map.addControl(new CropLegendControl());
  }
  updateFeatureCount(e) {
      // const extent = this.map.getView().calculateExtent();
      const extent = this.map.getView().calculateExtentInternal();
      const result = {
        area: 0,
        count: 0,
        perCrop: {}
      }
      for (const vt of this.vectortiles) {
        forFeaturesInExtent(vt, extent, (feature) => {
            const area = feature.properties_["area"] || toGeometry(feature).getArea();
            const crop = feature.properties_[CROP_ATTRIBUTE];
            result.count++;
            result.area += area;
            result[crop] = (result[crop] || 0) + area;
        });
      }
      console.log(extent, result);
  }
  addPMTilesLayer(c, options) {
    const source = new PMTilesVectorSource(options);
    const fields = new VectorTile({
      declutter: true,
      title: c.title,
      displayInLayerSwitcher: true,
      minZoom: this.minZoom,
      source: source,
      style: this.fieldStyle,
    });
    // TODO, Count the features in view and display a legend explaining the top 5 crops
    // TODO, Add a filter based on crops. This will not be perfect on high zoom levels (lossy vector tiles)
    this.vectortiles.push(fields);
    source.on('tileloadend', e => {
      const features = e.tile.getFeatures();
      for (const feature of features) {
        const p = feature.getProperties();
        p.color = mapping[p[CROP_ATTRIBUTE]] || "#99bbccaa";
      }
      this.updateFeatureCount(e)
    })
    this.map.addLayer(fields);
  }
}

const cropCollections = collections.filter(c => c.fiboa_extensions?.includes(cropExtension));
const m = new CropMap();
m.addCollections(cropCollections);
