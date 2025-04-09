import collections from '../sources'
import {FiboaMap} from "../map";
import {hcat} from "./codes";
import VectorTile from "ol/layer/VectorTile";
import {PMTilesVectorSource} from "ol-pmtiles";
const cropExtension = "https://fiboa.github.io/hcat-extension/v0.1.0/schema.yaml";

const fieldStyle = {
  "stroke-color": 'rgb(0, 165, 255)',
  "stroke-width": 1,
  "fill-color":  ['get', 'color']
}
const mapping = Object.fromEntries(hcat.map(c => [c.code, c.color]));

class CropMap extends FiboaMap {
  constructor() {
    super();
    this.fieldStyle = fieldStyle;
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
    // source.on('tileloadend', e => {
    //   const features = e.tile.getFeatures();
    //   console.log(e, features.length, features[0].getProperties());
    //   for (const feature of features) {
    //     feature.getProperties().color = "##ff0000";
    //   }
    // })
    source.on('tileloadend', e => {
      const features = e.tile.getFeatures();
      for (const feature of features) {
        const p = feature.getProperties();
        p.color = mapping[p["ec:hcat_code"]] || "#99bbccaa";
      }
      this.updateFeatureCount(e)
    })
    this.map.addLayer(fields);
  }
}

const cropCollections = collections.filter(c => c.fiboa_extensions?.includes(cropExtension));
const m = new CropMap();
m.addCollections(cropCollections);
