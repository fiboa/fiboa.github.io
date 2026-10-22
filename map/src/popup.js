import { Popup } from "maplibre-gl";

const popup = new Popup({ maxWidth: "420px", className: "fiboa-popup" });

function element(tag, text, attributes = {}) {
  const node = Object.assign(document.createElement(tag), attributes);
  if (text !== undefined) node.textContent = text;
  return node;
}

function propertyList(properties) {
  const list = element("ul");
  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined || value === null || value === "") continue;
    const item = element("li");
    const isQuantity = typeof value === "number" && !key.endsWith("code");
    item.append(element("strong", `${key}: `), isQuantity ? value.toLocaleString() : String(value));
    list.append(item);
  }
  return list;
}

function collectionSection(map, c) {
  const section = element("section");
  section.append(element("h3", c.title));
  const actions = element("p");
  actions.append(element("a", "Get the data", { href: c.url, target: "_blank", className: "button" }));
  if (c.pmtiles) {
    const focus = element("button", "Focus on map", { type: "button" });
    focus.addEventListener("click", () => {
      popup.remove();
      map.fitBounds(c.bbox[0], { duration: 500 });
    });
    actions.append(focus);
  } else {
    actions.append(element("span", "No visualization available for this dataset.", { className: "no-viz" }));
  }
  section.append(actions);
  section.append(propertyList({ id: c.id, fields: c.count, boundaries: c.boundaries, attribution: c.attribution }));
  return section;
}

function fieldSection(feature, c) {
  const section = element("section");
  section.append(element("h3", c?.title ?? feature.source), propertyList(feature.properties));
  return section;
}

// An overview cell: its fields and the crop groups with the most hectares.
function cellSection(feature) {
  const p = feature.properties;
  const section = element("section");
  section.append(element("h3", "Fields in this cell"));
  const crops = Object.entries(p)
    .filter(([key, ha]) => key.startsWith("ha_") && ha > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, ha]) => [`${key.slice(3)} (ha)`, ha]);
  section.append(propertyList({
    fields: p.count,
    "field area (ha)": p.area_ha,
    "share of the cell (%)": p.pct_covered,
    ...Object.fromEntries(crops),
  }));
  return section;
}

export function showPopup(map, lngLat, features, collections) {
  const byId = Object.fromEntries(collections.map(c => [c.id, c]));
  const sections = features.map(f =>
    f.source === "bboxes"
      ? collectionSection(map, byId[f.properties.id])
      : f.source === "cells"
        ? cellSection(f)
        : fieldSection(f, byId[f.source]),
  );
  if (!sections.length) {
    popup.remove();
    return;
  }
  const content = element("div");
  content.append(...sections);
  popup.setLngLat(lngLat).setDOMContent(content).addTo(map);
}
