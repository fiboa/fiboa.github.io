import "./style.css";
import { Feature, Map, Overlay, View } from "ol";
import { fromExtent } from "ol/geom/Polygon";
import TileLayer from 'ol/layer/WebGLTile.js';
import VectorTile from "ol/layer/VectorTile";
import VectorLayer from "ol/layer/Vector";
import { useGeographic } from 'ol/proj';
import { OSM, Vector } from "ol/source";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import LayerSwitcher from "ol-ext/control/LayerSwitcher"
import { PMTilesVectorSource } from "ol-pmtiles";
import collections from './sources'
import Fill from "ol/style/Fill";

useGeographic();

const minZoom = 7;

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      displayInLayerSwitcher: false,
      source: new OSM()
    })
  ],
  view: new View({
    projection: 'EPSG:3857',
    center: [0, 20],
    zoom: 1
  }),
  controls: [
    new LayerSwitcher({
      show_progress: true,
      extent: true
    })
  ]
});

const bboxStroke = new Stroke({
  color: 'rgb(0, 0, 0)',
  width: 1
});
const bboxRedStroke = new Stroke({
  color: 'rgb(255, 0, 0)',
  width: 1
});
const bboxFill = new Fill({
  color: 'rgba(0, 0, 0, 0.1)'
});
const fieldStyle = new Style({
  stroke: new Stroke({
    color: 'rgb(0, 165, 255)',
    width: 1
  }),
  fill: new Fill({
    color: 'rgba(0, 165, 255, 0.1)'
  })
});

let count = 0;
for (const c of collections) {
  const bboxes = c.bbox.length > 1 ? c.bbox.slice(1) : c.bbox;
  const features = [];
  for (const bbox of bboxes) {
    const feature = new Feature(fromExtent(bbox));
    feature.setProperties(c);
    features.push(feature);
  }
  const bboxLayer = new VectorLayer({
    title: c.title,
    displayInLayerSwitcher: false,
    maxZoom: c.pmtiles ? minZoom : undefined,
    source: new Vector({ features }),
    style: new Style({
      stroke: c.pmtiles ? bboxStroke : bboxRedStroke,
      fill: bboxFill
    })
  });
  map.addLayer(bboxLayer);

  if (c.count > 0) {
    count += c.count;
  }

  if (c.pmtiles) {
    const options = {
      url: c.pmtiles
    };
    if (c.attribution) {
      options.attributions = [c.attribution];
    }
    const fields = new VectorTile({
      declutter: true,
      title: c.title,
      displayInLayerSwitcher: true,
      minZoom,
      source: new PMTilesVectorSource(options),
      style: fieldStyle
    });
    map.addLayer(fields);
  }
}

document.getElementById('count').innerText = count.toLocaleString();

const popup = document.getElementById('popup');
const overlay = new Overlay({
  element: popup,
  positioning: 'bottom-center',
  stopEvent: true,
});
map.addOverlay(overlay);

// Add a click event listener to the map
map.on('click', event => {
  const features = map.getFeaturesAtPixel(event.pixel);
  let content = '';
  for (const feature of features) {
    const properties = feature.getProperties();
    const isCollection = Array.isArray(properties.bbox);

    content += `<h3>${properties.title || properties.id || 'unknown identifier'}</h3>`;
    if (isCollection && properties.source) {
      content += `<p><a href="${properties.source}" target="_blank">Get the data</a></p>`;
    }
    if (isCollection && !properties.pmtiles) {
      content += `<p>No visualization available for this dataset.</p>`;
    }
    content += `<ul>`;
    for (const key in properties) {
      if (typeof key !== 'undefined' && !['geometry', 'bbox', 'title', 'pmtiles', 'source'].includes(key)) {

        content += `<li><strong>${key}:</strong> `
        if (Array.isArray(properties[key])) {
          content += properties[key].join(', ');
        }
        else if (typeof properties[key] === 'number') {
          content += properties[key].toLocaleString();
        }
        else {
          content += properties[key];
        }
        content += `</li>`;
      }
    }

    content += '</ul>';
    
  }
  overlay.setPosition(content ? event.coordinate : undefined);
  popup.innerHTML = content;
});

// Change mouse cursor when hovering over features
map.on('pointermove', e => {
  const hit = map.hasFeatureAtPixel(e.pixel);
  map.getTargetElement().style.cursor = hit ? 'pointer' : '';
});

map.on('moveend', () => {
  const showBBox = map.getView().getZoom() < minZoom;
  document.getElementById('hint').style.display = showBBox ? 'block' : 'none';
});