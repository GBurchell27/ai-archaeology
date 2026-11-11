import type { LayerInfo, PlacedSite, TerrainMetadata, ViewSettings } from "./types";

export interface PanelActions {
  selectSite: (siteId: string | null) => void;
  setLayer: (layerId: string) => void;
  setOpacity: (opacity: number) => void;
  setCompare: (enabled: boolean) => void;
  setCompareLayer: (layerId: string) => void;
  setSplit: (split: number) => void;
  setExaggeration: (value: number) => void;
  setAzimuth: (degrees: number) => void;
  setAltitude: (degrees: number) => void;
  setLabels: (visible: boolean) => void;
}

const KIND_LABEL: Record<PlacedSite["feature"]["properties"]["kind"], string> = {
  validation: "Validation site",
  published: "Published site",
  submerged: "Submerged",
  landmark: "Landmark",
};

export function mountPanel(
  panel: HTMLElement,
  credit: HTMLElement,
  metadata: TerrainMetadata,
  sites: PlacedSite[],
  actions: PanelActions,
): (settings: ViewSettings) => void {
  panel.replaceChildren();
  credit.replaceChildren();
  const siteCard = document.createElement("section");
  siteCard.className = "site-card";
  const layerBox = document.createElement("div");
  layerBox.className = "layer-list";
  panel.append(
    siteList(sites, actions),
    siteCard,
    layerSection(metadata.catalog, layerBox, actions),
    viewSection(actions),
  );
  writeCredit(credit, metadata);
  return (settings) => {
    markActiveSite(panel, settings.selectedId);
    fillSiteCard(siteCard, metadata, sites, settings);
    markActiveLayer(layerBox, settings);
  };
}

function siteList(sites: PlacedSite[], actions: PanelActions): HTMLElement {
  const section = document.createElement("section");
  const heading = document.createElement("h2");
  heading.textContent = "Published points";
  const list = document.createElement("div");
  list.className = "site-list";
  for (const site of sites) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `site-button kind-${site.feature.properties.kind}`;
    button.dataset.siteId = site.feature.id;
    button.textContent = site.feature.properties.name;
    button.addEventListener("click", () => actions.selectSite(site.feature.id));
    list.append(button);
  }
  const back = document.createElement("button");
  back.type = "button";
  back.className = "text-button";
  back.dataset.action = "overview";
  back.textContent = "Back to the whole region";
  back.addEventListener("click", () => actions.selectSite(null));
  section.append(heading, list, back);
  return section;
}

function layerSection(catalog: LayerInfo[], box: HTMLElement, actions: PanelActions): HTMLElement {
  const section = document.createElement("section");
  const heading = document.createElement("h2");
  heading.textContent = "Layers";
  for (const layer of catalog) {
    box.append(layerRow(layer, actions));
  }
  const description = document.createElement("p");
  description.className = "layer-copy";
  description.dataset.role = "layer-copy";
  section.append(heading, box, description, compareControls(catalog, actions), opacityControl(actions));
  return section;
}

function layerRow(layer: LayerInfo, actions: PanelActions): HTMLElement {
  const label = document.createElement("label");
  label.className = layer.kind === "placeholder" ? "layer-row is-placeholder" : "layer-row";
  const input = document.createElement("input");
  input.type = "radio";
  input.name = "active-layer";
  input.value = layer.id;
  input.dataset.layerId = layer.id;
  input.disabled = layer.kind === "placeholder";
  input.addEventListener("change", () => actions.setLayer(layer.id));
  const text = document.createElement("span");
  text.textContent = layer.kind === "placeholder" ? `${layer.title} — not included yet` : layer.title;
  label.append(input, text);
  return label;
}

function compareControls(catalog: LayerInfo[], actions: PanelActions): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "compare-box";
  const toggle = document.createElement("label");
  toggle.className = "check-row";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.dataset.role = "compare";
  checkbox.addEventListener("change", () => actions.setCompare(checkbox.checked));
  const toggleText = document.createElement("span");
  toggleText.textContent = "Compare two layers";
  toggle.append(checkbox, toggleText);

  const select = document.createElement("select");
  select.dataset.role = "compare-layer";
  select.addEventListener("change", () => actions.setCompareLayer(select.value));
  for (const layer of catalog.filter((item) => item.kind !== "placeholder")) {
    const option = document.createElement("option");
    option.value = layer.id;
    option.textContent = layer.title;
    select.append(option);
  }

  const swipeLabel = document.createElement("label");
  swipeLabel.className = "slider-row";
  swipeLabel.append(sliderCaption("Swipe / side by side"), range(0, 100, 50, 1, "swipe", (value) => {
    actions.setSplit(value / 100);
  }));
  const half = document.createElement("button");
  half.type = "button";
  half.className = "text-button";
  half.dataset.action = "half";
  half.textContent = "Side by side";
  half.addEventListener("click", () => {
    const swipe = swipeLabel.querySelector("input");
    if (swipe instanceof HTMLInputElement) {
      swipe.value = "50";
    }
    actions.setSplit(0.5);
    actions.setCompare(true);
    checkbox.checked = true;
  });
  wrap.append(toggle, select, swipeLabel, half);
  return wrap;
}

function opacityControl(actions: PanelActions): HTMLElement {
  return labelledRange("Layer opacity", 0, 100, 100, 1, "opacity", (value) => {
    actions.setOpacity(value / 100);
  });
}

function viewSection(actions: PanelActions): HTMLElement {
  const section = document.createElement("section");
  const heading = document.createElement("h2");
  heading.textContent = "View";
  const labels = document.createElement("label");
  labels.className = "check-row";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = true;
  checkbox.dataset.role = "labels";
  checkbox.addEventListener("change", () => actions.setLabels(checkbox.checked));
  const text = document.createElement("span");
  text.textContent = "Place names";
  labels.append(checkbox, text);
  section.append(
    heading,
    labelledRange("Vertical exaggeration", 1, 8, 3.5, 0.1, "exaggeration", actions.setExaggeration),
    labelledRange("Sun azimuth", 0, 360, 315, 1, "azimuth", actions.setAzimuth),
    labelledRange("Sun altitude", 5, 80, 42, 1, "altitude", actions.setAltitude),
    labels,
  );
  return section;
}

function fillSiteCard(
  card: HTMLElement,
  metadata: TerrainMetadata,
  sites: PlacedSite[],
  settings: ViewSettings,
): void {
  card.replaceChildren();
  const site = sites.find((item) => item.feature.id === settings.selectedId);
  const layer = metadata.catalog.find((item) => item.id === settings.layerId);
  const copy = document.querySelector("[data-role='layer-copy']");
  if (copy) {
    const scale = site
      ? `${Math.round(site.record.pixelSizeM)} m cells over ${site.record.neighbourhoodM / 1000} km`
      : `${Math.round(metadata.region.pixelSizeM)} m cells, whole window`;
    copy.textContent = layer ? `${layer.description} Showing ${scale}.` : "";
  }
  if (!site) {
    const title = document.createElement("h2");
    title.textContent = "Germuş, Tektek, Harran plain";
    const body = document.createElement("p");
    body.textContent = "Overview of the Şanlıurfa window. Choose a published point to fly in and read its sources. Rings mark those points. They are not surveyed walls.";
    card.append(title, body);
    return;
  }
  const properties = site.feature.properties;
  const title = document.createElement("h2");
  title.textContent = properties.name;
  const meta = document.createElement("p");
  meta.className = "meta";
  meta.textContent = `${KIND_LABEL[properties.kind]} · ${properties.period}`;
  const description = document.createElement("p");
  description.textContent = properties.description;
  const notes = document.createElement("p");
  notes.textContent = properties.notes;
  const source = document.createElement("a");
  source.href = properties.sourceUrl;
  source.target = "_blank";
  source.rel = "noreferrer";
  source.textContent = properties.source;
  const sentinel = document.createElement("p");
  sentinel.className = "meta";
  sentinel.textContent = `Sentinel-2 L2A ${metadata.sentinel.day} · ${metadata.sentinel.sceneIds.length} granules. Ground near the pin: ${Math.round(site.record.groundElevation)} m on the DEM.`;
  const scenes = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Scene ids";
  const list = document.createElement("ul");
  for (const sceneId of metadata.sentinel.sceneIds) {
    const item = document.createElement("li");
    item.textContent = sceneId;
    list.append(item);
  }
  scenes.append(summary, list);
  card.append(title, meta, description, notes, source, sentinel, scenes);
  card.dataset.selected = site.feature.id;
}

function markActiveSite(panel: HTMLElement, selectedId: string | null): void {
  for (const button of panel.querySelectorAll<HTMLButtonElement>("[data-site-id]")) {
    button.classList.toggle("is-selected", button.dataset.siteId === selectedId);
  }
}

function markActiveLayer(box: HTMLElement, settings: ViewSettings): void {
  for (const input of box.querySelectorAll<HTMLInputElement>("input[data-layer-id]")) {
    input.checked = input.dataset.layerId === settings.layerId;
  }
  const compare = document.querySelector<HTMLInputElement>("[data-role='compare']");
  if (compare) {
    compare.checked = settings.compare;
  }
  const select = document.querySelector<HTMLSelectElement>("[data-role='compare-layer']");
  if (select && select.value !== settings.compareLayerId) {
    select.value = settings.compareLayerId;
  }
}

function writeCredit(credit: HTMLElement, metadata: TerrainMetadata): void {
  const dem = document.createElement("p");
  dem.textContent = metadata.attribution.dem;
  const sentinel = document.createElement("p");
  sentinel.textContent = metadata.attribution.sentinel;
  credit.append(dem, sentinel);
}

function labelledRange(
  caption: string,
  min: number,
  max: number,
  value: number,
  step: number,
  role: string,
  onInput: (value: number) => void,
): HTMLElement {
  return rangeRow(caption, min, max, value, step, role, onInput);
}

function rangeRow(
  caption: string,
  min: number,
  max: number,
  value: number,
  step: number,
  role: string,
  onInput: (value: number) => void,
): HTMLElement {
  const label = document.createElement("label");
  label.className = "slider-row";
  label.append(sliderCaption(caption), range(min, max, value, step, role, onInput));
  return label;
}

function sliderCaption(text: string): HTMLElement {
  const span = document.createElement("span");
  span.textContent = text;
  return span;
}

function range(
  min: number,
  max: number,
  value: number,
  step: number,
  role: string,
  onInput: (value: number) => void,
): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.dataset.role = role;
  input.addEventListener("input", () => onInput(Number(input.value)));
  return input;
}
