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
const hcats = hcat.map(c => [c.code, c])
const mp = Object.fromEntries(hcats);
const mapping = [4,6,8,10].map(l => Object.fromEntries(hcat.map(c => [c.code, mp[c.code.slice(0,l).padEnd(c.code.length, "0")]])));

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
    this.map.addLayer(fields);
  }
}

const cropCollections = collections.filter(c => c.fiboa_extensions?.includes(cropExtension));
const m = new CropMap();
m.addCollections(cropCollections);
