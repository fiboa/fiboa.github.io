import collections from '../sources'
import {FiboaMap} from "../map";
import {hcat} from "./codes";
import VectorTile from "ol/layer/VectorTile";
import {PMTilesVectorSource} from "ol-pmtiles";
const cropExtension = "https://fiboa.github.io/hcat-extension/v0.1.0/schema.yaml";
import {CropLegendControl} from "./CropLegendControl";

const CROP_ATTRIBUTE = "ec:hcat_code";
const fieldStyle = {
  "stroke-color": 'rgb(88, 88, 88, 88)',
  "stroke-width": 0.5,
  "fill-color":  ['get', 'color']
}
const mapping = Object.fromEntries(hcat.map(c => [c.code, c]));

class CropMap extends FiboaMap {
  constructor() {
    super();
    this.fieldStyle = fieldStyle;
    this.map.addControl(new CropLegendControl({attribute: CROP_ATTRIBUTE, mapping}));
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

    this.map.addLayer(fields);
  }
}

const cropCollections = collections.filter(c => c.fiboa_extensions?.includes(cropExtension));
const m = new CropMap();
m.addCollections(cropCollections);
