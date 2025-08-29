import "./style.css";
import { Feature, Map, Overlay, View } from "ol";
import { fromExtent } from "ol/geom/Polygon";
import TileLayer from 'ol/layer/WebGLTile.js';
import VectorTile from "ol/layer/VectorTile";
import VectorLayer from "ol/layer/Vector";
import { useGeographic } from 'ol/proj';
import { OSM, Vector } from "ol/source";
import LayerSwitcher from "ol-ext/control/LayerSwitcher"
import { PMTilesVectorSource } from "ol-pmtiles";
import Stroke from "ol/style/Stroke";
import Fill from "ol/style/Fill";
import Style from "ol/style/Style";

useGeographic();
export class FiboaMap {
  minZoom = 7;
  bboxStroke = new Stroke({
    color: 'rgb(0, 0, 0)',
    width: 1
  });
  bboxRedStroke = new Stroke({
    color: 'rgb(255, 0, 0)',
    width: 1
  });
  bboxFill = new Fill({
    color: 'rgba(0, 0, 0, 0.1)'
  });
  fieldStyle = new Style({
    stroke: new Stroke({
      color: 'rgb(0, 165, 255)',
      width: 1
    }),
    fill: new Fill({
      color: 'rgba(0, 165, 255, 0.1)'
    })
  });

  constructor() {
    this.map = new Map({
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
    })
    const popup = document.getElementById('popup');
    this.overlay = new Overlay({
      element: popup,
      positioning: 'bottom-center',
      stopEvent: true,
    });
    this.map.addOverlay(this.overlay);
    for (const method of ["click", "pointermove", "moveend"]) {
      this.map.on(method, this[method].bind(this))
    }
  }
  addBboxLayers(collections) {
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
        maxZoom: c.pmtiles ? this.minZoom : undefined,
        source: new Vector({features}),
        style: new Style({
          stroke: c.pmtiles ? this.bboxStroke : this.bboxRedStroke,
          fill: this.bboxFill
        })
      });
      this.map.addLayer(bboxLayer);
    }
  }
  addPMTilesLayer(c, options) {
    const fields = new VectorTile({
      declutter: true,
      title: c.title,
      displayInLayerSwitcher: true,
      minZoom: this.minZoom,
      source: new PMTilesVectorSource(options),
      style: this.fieldStyle
    });
    this.map.addLayer(fields);
  }
  addPmtilesLayers(collections) {
    for (const c of collections) {
      if (!c.pmtiles) continue;

      const options = {
        url: c.pmtiles
      };
      if (c.attribution) {
        options.attributions = [c.attribution];
      }
      this.addPMTilesLayer(c, options);
    }
  }
  addCollections(collections) {
    this.addBboxLayers(collections);
    this.addPmtilesLayers(collections);
    const count = collections.reduce((acc, c) => acc + c.count || 0, 0);
    document.getElementById('count').innerText = count.toLocaleString();
  }
  // Add a click event listener to the map
  click(event) {
    const map = this.map;
    const features = map.getFeaturesAtPixel(event.pixel);
    const nodes = [];
    for (const feature of features) {
      const properties = feature.getProperties();
      const isCollection = Array.isArray(properties.bbox);
      if (nodes.length) nodes.push(document.createElement('hr'));
      let content = `<h3>${properties.title || properties.id || 'unknown identifier'}</h3>`;
      if (isCollection) {
        let lcontent = "";
        if (properties.source) {
          lcontent+= `<form action="${properties.source}" target="_blank"><button>Get the data</button></form>`;
        }
        if (properties.pmtiles) {
          lcontent += `<button class="focus">Focus on map</button></p>`;
        } else {
          lcontent += `<span class="no-viz">No visualization available for this dataset.</span>`;
        }
        content += `<p>${lcontent}</p>`;
      }
      content += '<ul>';
      for (const key in properties) {
        let lcontent = "";
        if (typeof key !== 'undefined' && !['geometry', 'bbox', 'title', 'pmtiles', 'source'].includes(key)) {
          lcontent += `<li><strong>${key}:</strong>`
          if (Array.isArray(properties[key])) {
            lcontent += properties[key].join(', ');
          } else if (typeof properties[key] === 'number') {
            lcontent += properties[key].toLocaleString();
          } else {
            lcontent += properties[key];
          }
          content += `<li>${lcontent}</li>`;
        }
      }
      content += '</ul>';

      const container = document.createElement('section');
      container.innerHTML = content;
      nodes.push(container);

      const focusLink = container.getElementsByClassName("focus");
      if (focusLink.length > 0) {
        focusLink[0].addEventListener('click', () => {
          this.overlay.setPosition(undefined);
          map.getView().fit(feature.getGeometry().getExtent(), { duration: 500 });
        });
      }
    }
    this.overlay.setPosition(nodes.length > 0 ? event.coordinate : undefined);
    popup.replaceChildren(...nodes);
  }

  // Change mouse cursor when hovering over features
  pointermove(e) {
    const hit = this.map.hasFeatureAtPixel(e.pixel);
    this.map.getTargetElement().style.cursor = hit ? 'pointer' : '';
  }

  moveend(e) {
    const showBBox = this.map.getView().getZoom() < this.minZoom;
    document.getElementById('hint').style.display = showBBox ? 'block' : 'none';
  }
}
