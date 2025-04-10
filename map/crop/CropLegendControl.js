import Control from 'ol/control/Control';

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

    this.legendItems = [];
    this.render();
  }

  setMap(map) {
    super.setMap(map);

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
