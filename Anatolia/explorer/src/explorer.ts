import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { flyTo, overviewPose, sitePose } from "./flyCamera";
import { loadHeight, loadMetadata, loadSites, loadTexture } from "./loadData";
import { mountPanel } from "./panel";
import { createPins, markSelectedPin, placePin, setPinLabels, type SitePin } from "./pins";
import { applyReliefView, createBlankTexture, createReliefMaterial, showLayerTexture } from "./reliefMaterial";
import { applyExaggeration, buildTerrainGeometry, type TerrainGrid } from "./terrainMesh";
import type { PlacedSite, TerrainMetadata, ViewSettings } from "./types";

interface Surface {
  mesh: THREE.Mesh;
  grid: TerrainGrid;
  material: THREE.ShaderMaterial;
  rasters: Record<string, string>;
}

export async function startExplorer(): Promise<void> {
  const viewport = document.querySelector("#viewport");
  const panel = document.querySelector("#panel");
  const credit = document.querySelector("#credit");
  const status = document.querySelector("#status");
  const honest = document.querySelector("#honest");
  if (!(viewport instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
    throw new Error("Explorer markup is missing");
  }
  if (!(credit instanceof HTMLElement) || !(status instanceof HTMLElement)) {
    throw new Error("Explorer markup is missing");
  }
  const metadata = await loadMetadata();
  const collection = await loadSites();
  if (honest) {
    honest.textContent = metadata.honestNote;
  }
  const sites = joinSites(metadata, collection.features);
  const session = new TerrainSession(viewport, metadata, sites);
  const renderPanel = mountPanel(panel, credit, metadata, sites, session.actions);
  session.onSettings = renderPanel;
  await session.start();
  renderPanel(session.settings);
  status.hidden = true;
  document.body.dataset.ready = "true";
  document.body.dataset.flying = "false";
}

class TerrainSession {
  readonly settings: ViewSettings = {
    selectedId: null,
    layerId: "shaded",
    opacity: 1,
    compare: false,
    compareLayerId: "true-colour",
    split: 0.5,
    exaggeration: 3.5,
    azimuth: 315,
    altitude: 42,
    labels: true,
  };

  onSettings: (settings: ViewSettings) => void = () => undefined;

  readonly actions = {
    selectSite: (siteId: string | null) => void this.selectSite(siteId),
    setLayer: (layerId: string) => void this.setLayer(layerId),
    setOpacity: (opacity: number) => this.setOpacity(opacity),
    setCompare: (enabled: boolean) => void this.setCompare(enabled),
    setCompareLayer: (layerId: string) => void this.setCompareLayer(layerId),
    setSplit: (split: number) => this.setSplit(split),
    setExaggeration: (value: number) => this.setExaggeration(value),
    setAzimuth: (degrees: number) => this.setSun(degrees, this.settings.altitude),
    setAltitude: (degrees: number) => this.setSun(this.settings.azimuth, degrees),
    setLabels: (visible: boolean) => this.setLabels(visible),
  };

  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly labels: CSS2DRenderer;
  private readonly controls: OrbitControls;
  private readonly blank = createBlankTexture();
  private readonly resolution = new THREE.Vector2(1, 1);
  private readonly origin: [number, number];
  private readonly datum: number;
  private readonly span: number;
  private region: Surface | null = null;
  private readonly details = new Map<string, Surface>();
  private pins: SitePin[] = [];
  private pointerDown = { x: 0, y: 0 };

  constructor(
    viewport: HTMLElement,
    private readonly metadata: TerrainMetadata,
    private readonly sites: PlacedSite[],
  ) {
    const [left, bottom, right, top] = metadata.region.bounds;
    this.origin = [(left + right) / 2, (bottom + top) / 2];
    this.datum = metadata.region.elevation.min;
    this.span = Math.max(right - left, top - bottom);
    this.camera = new THREE.PerspectiveCamera(42, 1, 20, this.span * 6);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0xcbb89a, 1);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = "label-layer";
    viewport.append(this.renderer.domElement, this.labels.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04;
    this.controls.minDistance = 350;
    this.controls.maxDistance = this.span * 2.2;
    this.renderer.domElement.addEventListener("pointerdown", (event) => {
      this.pointerDown = { x: event.clientX, y: event.clientY };
    });
    this.renderer.domElement.addEventListener("pointerup", (event) => this.onPointerUp(event));
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        void this.selectSite(null);
      }
    });
    this.resize();
  }

  async start(): Promise<void> {
    const regionGrid = await this.loadGrid(this.metadata.region, "region/height.u16");
    this.region = this.addSurface(regionGrid, this.metadata.region.rasters, false);
    this.pins = createPins(this.sites, this.origin, this.datum, this.settings.exaggeration);
    for (const pin of this.pins) {
      this.scene.add(pin.group);
    }
    const pose = overviewPose(this.span);
    this.camera.position.copy(pose.position);
    this.controls.target.copy(pose.target);
    this.syncMaterials();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private async selectSite(siteId: string | null): Promise<void> {
    this.settings.selectedId = siteId;
    document.body.dataset.site = siteId ?? "";
    markSelectedPin(this.pins, siteId);
    for (const [id, surface] of this.details) {
      surface.mesh.visible = id === siteId;
    }
    this.publish();
    if (!siteId) {
      flyTo(this.camera, this.controls, overviewPose(this.span), 1600, () => undefined);
      return;
    }
    document.body.dataset.detail = "loading";
    const surface = await this.ensureDetail(siteId);
    await this.applyTextures();
    surface.mesh.visible = true;
    document.body.dataset.detail = "ready";
    const pin = this.pins.find((item) => item.site.feature.id === siteId);
    if (pin) {
      flyTo(this.camera, this.controls, sitePose(pin.group.position), 1700, () => undefined);
    }
  }

  private async setLayer(layerId: string): Promise<void> {
    if (this.metadata.catalog.find((layer) => layer.id === layerId)?.kind === "placeholder") {
      return;
    }
    this.settings.layerId = layerId;
    this.publish();
    await this.applyTextures();
  }

  private setOpacity(opacity: number): void {
    this.settings.opacity = opacity;
    this.syncMaterials();
  }

  private async setCompare(enabled: boolean): Promise<void> {
    this.settings.compare = enabled;
    this.publish();
    await this.applyTextures();
  }

  private async setCompareLayer(layerId: string): Promise<void> {
    this.settings.compareLayerId = layerId;
    this.publish();
    await this.applyTextures();
  }

  private setSplit(split: number): void {
    this.settings.split = split;
    this.syncMaterials();
  }

  private setExaggeration(value: number): void {
    this.settings.exaggeration = value;
    if (this.region) {
      applyExaggeration(this.region.mesh.geometry, this.region.grid, this.datum, value);
    }
    for (const surface of this.details.values()) {
      applyExaggeration(surface.mesh.geometry, surface.grid, this.datum, value);
    }
    for (const pin of this.pins) {
      placePin(pin, this.origin, this.datum, value);
    }
    this.syncMaterials();
  }

  private setSun(azimuth: number, altitude: number): void {
    this.settings.azimuth = azimuth;
    this.settings.altitude = altitude;
    this.syncMaterials();
  }

  private setLabels(visible: boolean): void {
    this.settings.labels = visible;
    setPinLabels(this.pins, visible);
  }

  private publish(): void {
    this.onSettings(this.settings);
    document.body.dataset.layer = this.settings.layerId;
    document.body.dataset.compare = this.settings.compare ? "on" : "off";
  }

  private async ensureDetail(siteId: string): Promise<Surface> {
    const existing = this.details.get(siteId);
    if (existing) {
      return existing;
    }
    const record = this.sites.find((site) => site.feature.id === siteId)?.record;
    if (!record) {
      throw new Error(`No detail tile for ${siteId}`);
    }
    const grid = await this.loadGrid(record, `sites/${siteId}/height.u16`);
    const surface = this.addSurface(grid, record.rasters, true);
    this.details.set(siteId, surface);
    return surface;
  }

  private async applyTextures(): Promise<void> {
    document.body.dataset.layerReady = "false";
    const jobs: Promise<void>[] = [];
    if (this.region) {
      jobs.push(this.paint(this.region));
    }
    const selected = this.settings.selectedId ? this.details.get(this.settings.selectedId) : undefined;
    if (selected) {
      jobs.push(this.paint(selected));
    }
    await Promise.all(jobs);
    document.body.dataset.layerReady = "true";
  }

  private async paint(surface: Surface): Promise<void> {
    showLayerTexture(surface.material, "a", await this.textureFor(surface, this.settings.layerId), this.blank);
    showLayerTexture(
      surface.material,
      "b",
      await this.textureFor(surface, this.settings.compareLayerId),
      this.blank,
    );
  }

  private async textureFor(surface: Surface, layerId: string): Promise<THREE.Texture | null> {
    const relative = surface.rasters[layerId];
    if (!relative) {
      return null;
    }
    return loadTexture(relative);
  }

  private addSurface(grid: TerrainGrid, rasters: Record<string, string>, detail: boolean): Surface {
    const geometry = buildTerrainGeometry(
      grid,
      this.origin,
      this.datum,
      this.settings.exaggeration,
      this.metadata.region.elevation,
    );
    const material = createReliefMaterial(this.blank);
    if (detail) {
      material.polygonOffset = true;
      material.polygonOffsetFactor = -1.2;
      material.polygonOffsetUnits = -8;
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = !detail;
    this.scene.add(mesh);
    return { mesh, grid, material, rasters };
  }

  private async loadGrid(
    record: { bounds: TerrainGrid["bounds"]; width: number; height: number; elevation: { min: number; max: number } },
    heightPath: string,
  ): Promise<TerrainGrid> {
    const metres = await loadHeight(heightPath, record.width, record.height, record.elevation.min, record.elevation.max);
    return { width: record.width, height: record.height, bounds: record.bounds, metres };
  }

  private syncMaterials(): void {
    this.renderer.getDrawingBufferSize(this.resolution);
    const surfaces = [this.region, ...this.details.values()].filter((item): item is Surface => item !== null);
    for (const surface of surfaces) {
      applyReliefView(
        surface.material,
        this.settings.azimuth,
        this.settings.altitude,
        this.settings.opacity,
        this.settings.compare,
        this.settings.split,
        this.resolution,
      );
    }
  }

  private frame(): void {
    if (this.controls.enabled) {
      this.controls.update();
    }
    this.scaleSprites();
    this.syncMaterials();
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }

  private scaleSprites(): void {
    const selected = this.settings.selectedId;
    for (const pin of this.pins) {
      const distance = this.camera.position.distanceTo(pin.group.position);
      const selectedBoost = pin.site.feature.id === selected ? 1.35 : 1;
      const size = Math.min(700, Math.max(140, distance * 0.011)) * selectedBoost;
      pin.sprite.scale.set(size, size, 1);
    }
  }

  private onPointerUp(event: PointerEvent): void {
    const moved = Math.hypot(event.clientX - this.pointerDown.x, event.clientY - this.pointerDown.y);
    if (moved > 6) {
      return;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, this.camera);
    const hits = raycaster.intersectObjects(this.pins.map((pin) => pin.sprite), false);
    const siteId = hits[0]?.object.userData.siteId;
    if (typeof siteId === "string") {
      void this.selectSite(siteId);
    }
  }

  private resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.labels.setSize(width, height);
  }
}

function joinSites(metadata: TerrainMetadata, features: PlacedSite["feature"][]): PlacedSite[] {
  return features.map((feature) => {
    const record = metadata.sites.find((site) => site.id === feature.id);
    if (!record) {
      throw new Error(`No terrain tile for ${feature.id}. Rebuild the web assets.`);
    }
    return { feature, record };
  });
}
