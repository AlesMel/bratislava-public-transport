// ──────────────────────────────────────────────────────────
// VehicleLayer — Real 3D vehicles rendered via Three.js
// inside a MapLibre custom layer (shared WebGL context)
// ──────────────────────────────────────────────────────────

import * as THREE from 'three';
import { MercatorCoordinate } from 'maplibre-gl';
import type {
  CustomLayerInterface,
  CustomRenderMethodInput,
  Map as MaplibreMap,
} from 'maplibre-gl';
import type { Vehicle } from '../types';

// ── Visual scale multiplier ───────────────────────────────
// Real-world vehicles (12 m) are invisible on the map.
// We scale them up so they look like chunky toy models.
const VISUAL_SCALE = 6.5;

// ── Palette ───────────────────────────────────────────────

const TYPE_HEX: Record<string, number> = {
  BUS:     0x3b82f6,
  TRAM:    0xef4444,
  TROLLEY: 0x22c55e,
  UNKNOWN: 0x6b7280,
};
const ROOF_HEX: Record<string, number> = {
  BUS:     0x2563eb,
  TRAM:    0xdc2626,
  TROLLEY: 0x16a34a,
  UNKNOWN: 0x4b5563,
};
const WINDOW_CLR = 0xcbddf8;
const WHEEL_CLR  = 0x1e293b;
const MAX_TURN_RATE = THREE.MathUtils.degToRad(120); // rad/s
const TURN_SMOOTHING = 6; // higher = faster interpolation
const MAX_DIRECTION_CONE = THREE.MathUtils.degToRad(75);
const HEADING_WEIGHT = 45;
const SWITCH_PENALTY = 160;

// ── Dimensions (meters) ──────────────────────────────────

const DIMS: Record<string, { l: number; w: number; h: number }> = {
  TRAM:    { l: 20, w: 3, h: 3.6 },
  BUS:     { l: 12, w: 3, h: 3.2 },
  TROLLEY: { l: 12, w: 3, h: 3.2 },
  UNKNOWN: { l: 10, w: 2.8, h: 3 },
};

// ── Shared geometries & materials ─────────────────────────
// Using MeshPhongMaterial instead of MeshStandardMaterial
// because Phong works correctly in a shared WebGL context
// (no PBR environment / IBL required).

const sharedGeo = {
  wheel: new THREE.CylinderGeometry(0.55, 0.55, 0.35, 16),
  shadow: new THREE.PlaneGeometry(1, 1),
};

const wheelMat = new THREE.MeshPhongMaterial({
  color: WHEEL_CLR,
  shininess: 10,
});
const shadowMat = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const windowMat = new THREE.MeshPhongMaterial({
  color: WINDOW_CLR,
  shininess: 90,
  specular: 0xffffff,
  transparent: true,
  opacity: 0.85,
});
const poleMat = new THREE.MeshPhongMaterial({
  color: 0x475569,
  shininess: 30,
});

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  // Modern browsers support roundRect; fall back to arcTo for older ones.
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x, y, w, h, r);
  } else {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}

// ── Label sprite from canvas ──────────────────────────────

function createLabelSprite(text: string, bgHex: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // pill background
  const bg = '#' + bgHex.toString(16).padStart(6, '0');
  ctx.fillStyle = bg;
  drawRoundedRect(ctx, 6, 6, 116, 52, 14);
  ctx.fill();

  // subtle border
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 6, 6, 116, 52, 14);
  ctx.stroke();

  // text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 35);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    depthTest: false,
    sizeAttenuation: true,
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(8, 4, 1);
  return s;
}

// ── Build one vehicle mesh group ──────────────────────────

function buildVehicle(type: string, line: string): THREE.Group {
  const g = new THREE.Group();
  const d = DIMS[type] ?? DIMS.UNKNOWN;
  const bodyClr = TYPE_HEX[type] ?? TYPE_HEX.UNKNOWN;
  const roofClr = ROOF_HEX[type] ?? ROOF_HEX.UNKNOWN;

  // ── body ──
  const bodyGeo = new THREE.BoxGeometry(d.l, d.h * 0.65, d.w);
  const bodyMat = new THREE.MeshPhongMaterial({
    color: bodyClr,
    shininess: 60,
    specular: 0x444444,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  const bodyBottom = 0.7;                        // wheel clearance
  const bodyCY = bodyBottom + d.h * 0.65 / 2;    // center‑y of body
  body.position.y = bodyCY;
  body.castShadow = true;
  g.add(body);

  // ── roof ──
  const roofH = d.h * 0.22;
  const roofGeo = new THREE.BoxGeometry(d.l - 0.4, roofH, d.w - 0.2);
  const roofMat = new THREE.MeshPhongMaterial({
    color: roofClr,
    shininess: 40,
  });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  const roofCY = bodyCY + d.h * 0.65 / 2 + roofH / 2;
  roof.position.y = roofCY;
  roof.castShadow = true;
  g.add(roof);

  // ── side windows (left + right) ──
  const winH = d.h * 0.3;
  const winGeo = new THREE.BoxGeometry(d.l - 2.2, winH, 0.12);

  const winL = new THREE.Mesh(winGeo, windowMat);
  winL.position.set(0, bodyCY + d.h * 0.08, d.w / 2 + 0.06);
  g.add(winL);

  const winR = new THREE.Mesh(winGeo, windowMat);
  winR.position.set(0, bodyCY + d.h * 0.08, -d.w / 2 - 0.06);
  g.add(winR);

  // ── front / rear windshield ──
  const shieldGeo = new THREE.BoxGeometry(0.12, winH, d.w - 0.7);
  const shieldF = new THREE.Mesh(shieldGeo, windowMat);
  shieldF.position.set(d.l / 2 + 0.06, bodyCY + d.h * 0.08, 0);
  g.add(shieldF);

  const shieldR = new THREE.Mesh(shieldGeo, windowMat);
  shieldR.position.set(-d.l / 2 - 0.06, bodyCY + d.h * 0.08, 0);
  g.add(shieldR);

  // ── wheels ──
  const wheelOffX = d.l * 0.35;
  const wheelZ = d.w / 2 + 0.18;
  const positions: [number, number, number][] = [
    [ wheelOffX, 0.55,  wheelZ],
    [ wheelOffX, 0.55, -wheelZ],
    [-wheelOffX, 0.55,  wheelZ],
    [-wheelOffX, 0.55, -wheelZ],
  ];
  for (const [px, py, pz] of positions) {
    const wh = new THREE.Mesh(sharedGeo.wheel, wheelMat);
    wh.rotation.x = Math.PI / 2;
    wh.position.set(px, py, pz);
    g.add(wh);
  }

  // ── tram pantograph ──
  if (type === 'TRAM') {
    const armGeo = new THREE.BoxGeometry(0.12, 2.4, 0.12);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.y = roofCY + roofH / 2 + 1.2;
    g.add(arm);
    const barGeo = new THREE.BoxGeometry(3.2, 0.1, 0.1);
    const bar = new THREE.Mesh(barGeo, poleMat);
    bar.position.y = roofCY + roofH / 2 + 2.4;
    g.add(bar);
  }

  // ── trolley poles ──
  if (type === 'TROLLEY') {
    for (const zOff of [-0.5, 0.5]) {
      const pGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.6, 8);
      const pole = new THREE.Mesh(pGeo, poleMat);
      pole.position.set(-1, roofCY + roofH / 2 + 1.8, zOff);
      pole.rotation.z = Math.PI * 0.14;
      g.add(pole);
    }
  }

  // ── ground shadow ──
  const shad = new THREE.Mesh(sharedGeo.shadow, shadowMat);
  shad.rotation.x = -Math.PI / 2;
  shad.position.y = 0.04;
  shad.scale.set(d.l + 2, d.w + 2, 1);
  g.add(shad);

  // ── label ──
  const label = createLabelSprite(line, bodyClr);
  label.position.y = roofCY + roofH / 2 + (type === 'TRAM' ? 5.5 : 4);
  g.add(label);

  // ── apply visual scale ──
  g.scale.set(VISUAL_SCALE, VISUAL_SCALE, VISUAL_SCALE);

  return g;
}

// ── Public layer class ────────────────────────────────────

export interface VehicleLayerOpts {
  origin: [number, number]; // [lng, lat]
  onVehicleClick?: (vehicle: Vehicle) => void;
}

export class VehicleLayer {
  /* Three.js scene plumbing */
  private scene  = new THREE.Scene();
  private camera = new THREE.Camera();
  private renderer!: THREE.WebGLRenderer;
  private map!: MaplibreMap;

  /* Model transform (origin → Mercator) */
  private tx!: number;
  private ty!: number;
  private tz!: number;
  private scale!: number;

  /* Vehicle bookkeeping */
  private groups = new Map<string, THREE.Group>();
  private data   = new Map<string, Vehicle>();

  /**
   * Heading tracker keyed by **vehicleID** (the physical vehicle),
   * NOT the compound id which changes on every stop change.
   * This lets us compute heading even when the compound key rotates.
   */
  private headingTracker = new Map<number, {
    x: number;
    z: number;
    heading: number;
    roadKey?: string;
  }>();
  private roadLayerIds: string[] = [];
  private selectedVehicleId: string | null = null;

  private origin: [number, number];
  private onVehicleClick?: (vehicle: Vehicle) => void;

  private clock = 0;
  private lastRenderTime = 0;

  constructor(opts: VehicleLayerOpts) {
    this.origin = opts.origin;
    this.onVehicleClick = opts.onVehicleClick;

    const mc = MercatorCoordinate.fromLngLat(this.origin, 0);
    this.tx    = mc.x;
    this.ty    = mc.y;
    this.tz    = mc.z as number;
    this.scale = mc.meterInMercatorCoordinateUnits();

    // ── Lighting ──
    // Strong ambient so vehicles are always clearly visible
    this.scene.add(new THREE.AmbientLight(0xffffff, 2.0));

    const sun = new THREE.DirectionalLight(0xfff4e0, 1.5);
    sun.position.set(80, 250, 120);
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xaaccff, 0.6);
    fill.position.set(-60, 100, -80);
    this.scene.add(fill);

    this.scene.add(new THREE.HemisphereLight(0xb1e1ff, 0xb97a20, 0.5));
  }

  private pickRoadLayers() {
    const layers = this.map?.getStyle()?.layers ?? [];
    const keywords = [
      'road',
      'street',
      'highway',
      'motorway',
      'rail',
      'tram',
      'bridge',
      'tunnel',
      'transport',
    ];

    this.roadLayerIds = layers
      .filter((l) => l.type === 'line')
      .filter((l) => {
        const id = l.id.toLowerCase();
        const srcLayer = typeof l['source-layer'] === 'string'
          ? l['source-layer'].toLowerCase()
          : '';
        return keywords.some((k) => id.includes(k) || srcLayer.includes(k));
      })
      .map((l) => l.id);
  }

  private angleDiff(a: number, b: number): number {
    let d = a - b;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return Math.abs(d);
  }

  private angleDelta(target: number, current: number): number {
    let d = target - current;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d;
  }

  private segmentKey(aLng: number, aLat: number, bLng: number, bLat: number): string {
    const a = `${aLng.toFixed(6)},${aLat.toFixed(6)}`;
    const b = `${bLng.toFixed(6)},${bLat.toFixed(6)}`;
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  private getRoadMatch(
    lng: number,
    lat: number,
    preferredHeading: number | null,
    stickyRoadKey?: string,
  ): { heading: number; roadKey: string; score: number } | null {
    if (!this.map || this.roadLayerIds.length === 0) return null;

    const p = this.map.project([lng, lat]);
    const pad = 14;
    const feats = this.map.queryRenderedFeatures(
      [[p.x - pad, p.y - pad], [p.x + pad, p.y + pad]],
      { layers: this.roadLayerIds },
    );

    let bestScore = Infinity;
    let bestHeading: number | null = null;
    let bestRoadKey: string | null = null;

    const testSegment = (aLng: number, aLat: number, bLng: number, bLat: number) => {
      const a = this.map.project([aLng, aLat]);
      const b = this.map.project([bLng, bLat]);
      const vx = b.x - a.x;
      const vy = b.y - a.y;
      const len2 = vx * vx + vy * vy;
      if (len2 < 1e-6) return;

      const wx = p.x - a.x;
      const wy = p.y - a.y;
      const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
      const cx = a.x + t * vx;
      const cy = a.y + t * vy;
      const dx = p.x - cx;
      const dy = p.y - cy;
      const d2 = dx * dx + dy * dy;
      const [ax, az] = this.toLocal(aLng, aLat);
      const [bx, bz] = this.toLocal(bLng, bLat);

      // Try both segment directions and keep the one closer to preferred heading.
      const hForward = -Math.atan2(bz - az, bx - ax);
      const hReverse = hForward + Math.PI;
      const heading = preferredHeading === null
        ? hForward
        : this.angleDiff(hForward, preferredHeading) <= this.angleDiff(hReverse, preferredHeading)
          ? hForward
          : hReverse;

      const headingDiff = preferredHeading === null
        ? 0
        : this.angleDiff(heading, preferredHeading);
      if (preferredHeading !== null && headingDiff > MAX_DIRECTION_CONE) {
        return;
      }

      // Distance dominates, but heading consistency helps avoid snapping to side roads.
      const headingPenalty = preferredHeading === null ? 0 : headingDiff * HEADING_WEIGHT;
      let score = d2 + headingPenalty * headingPenalty;
      const roadKey = this.segmentKey(aLng, aLat, bLng, bLat);
      if (stickyRoadKey && roadKey !== stickyRoadKey) {
        score += SWITCH_PENALTY;
      }

      if (score < bestScore) {
        bestScore = score;
        bestHeading = heading;
        bestRoadKey = roadKey;
      }
    };

    for (const f of feats) {
      const geom = f.geometry as { type?: string; coordinates?: unknown };
      if (!geom?.type || !geom?.coordinates) continue;

      if (geom.type === 'LineString') {
        const line = geom.coordinates as number[][];
        for (let i = 1; i < line.length; i++) {
          const a = line[i - 1];
          const b = line[i];
          if (a && b && a.length >= 2 && b.length >= 2) {
            testSegment(a[0], a[1], b[0], b[1]);
          }
        }
      } else if (geom.type === 'MultiLineString') {
        const multi = geom.coordinates as number[][][];
        for (const line of multi) {
          for (let i = 1; i < line.length; i++) {
            const a = line[i - 1];
            const b = line[i];
            if (a && b && a.length >= 2 && b.length >= 2) {
              testSegment(a[0], a[1], b[0], b[1]);
            }
          }
        }
      }
    }

    // Ignore weak matches that are too far from the snapped road segment.
    if (bestHeading === null || bestRoadKey === null || bestScore > 16 * 16) return null;
    return { heading: bestHeading, roadKey: bestRoadKey, score: bestScore };
  }

  // ── Convert lng/lat → local scene metres ───────────────

  private toLocal(lng: number, lat: number): [number, number] {
    const m = MercatorCoordinate.fromLngLat([lng, lat], 0);
    return [
      (m.x - this.tx) / this.scale,
      (m.y - this.ty) / this.scale,
    ];
  }

  // ── Sync vehicle list ──────────────────────────────────

  updateVehicles(vehicles: Vehicle[]) {
    const alive = new Set<string>();

    for (const v of vehicles) {
      alive.add(v.id);
      const [lx, lz] = this.toLocal(v.longitude, v.latitude);

      let grp = this.groups.get(v.id);
      if (!grp) {
        grp = buildVehicle(v.vehicleType, v.line);
        grp.userData.vid = v.id;
        this.scene.add(grp);
        this.groups.set(v.id, grp);
      }

      grp.position.x = lx;
      grp.position.z = lz;
      grp.userData.targetScale = this.selectedVehicleId === v.id
        ? VISUAL_SCALE * 1.25
        : VISUAL_SCALE;

      // ── Heading from road (preferred) with movement fallback ──
      const tracker = this.headingTracker.get(v.vehicleID);

      // Movement-derived preferred heading for disambiguating nearby side roads.
      let movementHeading: number | null = null;
      if (tracker) {
        const mdx = lx - tracker.x;
        const mdz = lz - tracker.z;
        if (Math.hypot(mdx, mdz) > 2) {
          movementHeading = -Math.atan2(mdz, mdx);
        }
      }
      const preferredHeading = movementHeading ?? tracker?.heading ?? null;
      const roadMatch = this.getRoadMatch(
        v.longitude,
        v.latitude,
        preferredHeading,
        tracker?.roadKey,
      );

      if (roadMatch !== null) {
        if (tracker) {
          tracker.heading = roadMatch.heading;
          tracker.x = lx;
          tracker.z = lz;
          tracker.roadKey = roadMatch.roadKey;
          grp.userData.targetHeading = tracker.heading;
        } else {
          this.headingTracker.set(v.vehicleID, {
            x: lx,
            z: lz,
            heading: roadMatch.heading,
            roadKey: roadMatch.roadKey,
          });
          grp.userData.targetHeading = roadMatch.heading;
          grp.rotation.y = roadMatch.heading;
        }
      } else {
        // Fallback to heading inferred from movement when we can't snap to road.
        if (tracker) {
          const dx = lx - tracker.x;
          const dz = lz - tracker.z;
          const dist = Math.hypot(dx, dz);
          // Only update heading when the vehicle has moved a meaningful amount
          // (GPS jitter is ~1-3 m; vehicles move ~14 m/s → ~70 m per 5 s poll)
          if (dist > 2) {
            tracker.heading = -Math.atan2(dz, dx);
            tracker.x = lx;
            tracker.z = lz;
          }
          grp.userData.targetHeading = tracker.heading;
        } else {
          // First time we see this physical vehicle — store position, no heading yet
          this.headingTracker.set(v.vehicleID, { x: lx, z: lz, heading: 0 });
          grp.userData.targetHeading = 0;
        }
      }

      this.data.set(v.id, v);
    }

    // remove stale groups
    for (const [id, grp] of this.groups) {
      if (!alive.has(id)) {
        this.scene.remove(grp);
        disposeGroup(grp);
        this.groups.delete(id);
        this.data.delete(id);
      }
    }

    // clean up heading tracker for vehicleIDs no longer in the dataset
    const aliveVehicleIDs = new Set(vehicles.map((v) => v.vehicleID));
    for (const vid of this.headingTracker.keys()) {
      if (!aliveVehicleIDs.has(vid)) this.headingTracker.delete(vid);
    }

    this.map?.triggerRepaint();
  }

  setSelectedVehicle(vehicleId: string | null) {
    this.selectedVehicleId = vehicleId;
    for (const [id, grp] of this.groups) {
      grp.userData.targetScale = this.selectedVehicleId === id
        ? VISUAL_SCALE * 1.25
        : VISUAL_SCALE;
    }
    this.map?.triggerRepaint();
  }

  // ── Click → closest vehicle within hit radius ──────────

  handleClick(lng: number, lat: number) {
    if (!this.onVehicleClick) return;
    const [cx, cz] = this.toLocal(lng, lat);

    let best: Vehicle | null = null;
    let bestD = Infinity;

    // Hit radius scales with VISUAL_SCALE
    const hitRadius = 25 * VISUAL_SCALE;

    for (const [id, grp] of this.groups) {
      const dx = grp.position.x - cx;
      const dz = grp.position.z - cz;
      const d  = Math.sqrt(dx * dx + dz * dz);
      if (d < bestD && d < hitRadius) {
        bestD = d;
        best  = this.data.get(id) ?? null;
      }
    }
    if (best) this.onVehicleClick(best);
  }

  // ── MapLibre CustomLayerInterface ──────────────────────

  getLayer(): CustomLayerInterface {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    return {
      id: 'vehicles-3d',
      type: 'custom',
      renderingMode: '3d',

      onAdd(map: MaplibreMap, gl: WebGLRenderingContext | WebGL2RenderingContext) {
        self.map = map;
        self.pickRoadLayers();
        self.renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl as WebGL2RenderingContext,
          antialias: true,
        });
        self.renderer.autoClear = false;
      },

      render(_gl: WebGLRenderingContext | WebGL2RenderingContext, opts: CustomRenderMethodInput) {
        const matrix = opts.defaultProjectionData?.mainMatrix ?? opts.modelViewProjectionMatrix;
        const now = performance.now();
        const dt = self.lastRenderTime > 0
          ? Math.min((now - self.lastRenderTime) / 1000, 0.1)
          : 1 / 60;
        self.lastRenderTime = now;

        // gentle bob animation
        self.clock += 0.014;
        for (const [, grp] of self.groups) {
          const targetHeading = typeof grp.userData.targetHeading === 'number'
            ? grp.userData.targetHeading
            : grp.rotation.y;
          const delta = self.angleDelta(targetHeading, grp.rotation.y);
          const desiredStep = delta * Math.min(1, dt * TURN_SMOOTHING);
          const maxStep = MAX_TURN_RATE * dt;
          const turnStep = THREE.MathUtils.clamp(desiredStep, -maxStep, maxStep);
          grp.rotation.y += turnStep;

          const targetScale = typeof grp.userData.targetScale === 'number'
            ? grp.userData.targetScale
            : VISUAL_SCALE;
          const scaleStep = Math.min(1, dt * 10);
          const nextScale = grp.scale.x + (targetScale - grp.scale.x) * scaleStep;
          grp.scale.set(nextScale, nextScale, nextScale);

          grp.position.y =
            Math.sin(self.clock * 1.8 + grp.position.x * 0.05) * 2;
        }

        // ── Build the camera projection matrix ──
        // MapLibre's MVP goes from Mercator coordinates → clip space.
        // Our model transform goes from scene (meters) → Mercator.
        // Final: clip = MVP × modelTransform × scenePosition
        const { tx, ty, tz, scale: s } = self;

        // Rotation to convert Three.js Y-up to Mercator Z-up
        const rotX = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(1, 0, 0),
          Math.PI / 2,
        );

        const mdl = new THREE.Matrix4()
          .makeTranslation(tx, ty, tz)
          .scale(new THREE.Vector3(s, -s, s))
          .multiply(rotX);

        const m = new THREE.Matrix4()
          .fromArray(matrix as unknown as number[])
          .multiply(mdl);

        self.camera.projectionMatrix.copy(m);
        self.camera.projectionMatrixInverse.copy(m).invert();

        self.renderer.resetState();
        self.renderer.render(self.scene, self.camera);

        self.map.triggerRepaint();   // keep animation loop alive
      },

      onRemove() {
        self.renderer?.dispose();
      },
    };
  }

  // ── Tear down ──────────────────────────────────────────

  dispose() {
    for (const [, grp] of this.groups) {
      this.scene.remove(grp);
      disposeGroup(grp);
    }
    this.groups.clear();
    this.data.clear();
    this.renderer?.dispose();
  }
}

// ── helpers ───────────────────────────────────────────────

function disposeGroup(g: THREE.Group) {
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      // only dispose non-shared geometry
      if (o.geometry !== sharedGeo.wheel && o.geometry !== sharedGeo.shadow) {
        o.geometry.dispose();
      }
      if (o.material !== wheelMat && o.material !== shadowMat && o.material !== windowMat && o.material !== poleMat) {
        (o.material as THREE.Material).dispose();
      }
    }
    if (o instanceof THREE.Sprite) {
      o.material.map?.dispose();
      o.material.dispose();
    }
  });
}
