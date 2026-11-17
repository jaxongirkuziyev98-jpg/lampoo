import type { DrawCommand } from '../types/lesson';

export type Point = [number, number];

export interface SketchSubLabel {
  text: string;
  x: number;
  y: number;
  color: string;
}

export interface SketchAsset {
  strokes: Point[][];
  colors: string[];
  subLabels: SketchSubLabel[];
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seedStr: string): () => number {
  let s = hashSeed(seedStr) || 1337;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates an organic hand-drawn line between (x1, y1) and (x2, y2)
 * with subtle human wrist arc and micro-imperfection.
 */
export function buildHandLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seedStr: string,
  roughness = 1.3
): Point[] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return [[x1, y1], [x2, y2]];

  const rng = makeRng(seedStr);
  const steps = Math.max(4, Math.min(28, Math.ceil(dist / 13)));
  const nx = -dy / dist;
  const ny = dx / dist;

  const bow = (rng() - 0.5) * roughness * Math.min(2.2, dist / 55);
  const phase = rng() * Math.PI * 2;
  const pts: Point[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const taper = Math.sin(t * Math.PI);
    const jitter = (rng() - 0.5) * roughness * 0.5 * taper;
    const wave = Math.sin(t * Math.PI * 2 + phase) * roughness * 0.38 * taper;
    const offset = bow * taper + jitter + wave;
    pts.push([x1 + dx * t + nx * offset, y1 + dy * t + ny * offset]);
  }
  return pts;
}

/**
 * Builds a hand-drawn closed ellipse/circle stroke starting at top (-90deg)
 * with tiny natural human closure overlap.
 */
export function buildHandEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seedStr: string,
  roughness = 1.4,
  rotationRad = 0
): Point[] {
  const rng = makeRng(seedStr);
  const steps = 42;
  const pts: Point[] = [];
  const phase1 = rng() * Math.PI * 2;
  const phase2 = rng() * Math.PI * 2;
  const startAngle = -Math.PI / 2 + (rng() - 0.5) * 0.2;
  const totalAngle = Math.PI * 2 + 0.12;
  const cosR = Math.cos(rotationRad);
  const sinR = Math.sin(rotationRad);

  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const angle = startAngle + u * totalAngle;
    const wobble =
      1 +
      (Math.sin(angle * 2 + phase1) * 0.02 +
        Math.cos(angle * 3 + phase2) * 0.013) *
        (roughness / 1.5);
    const lx = Math.cos(angle) * (rx * wobble) + (rng() - 0.5) * 0.5;
    const ly = Math.sin(angle) * (ry * wobble) + (rng() - 0.5) * 0.5;
    pts.push([cx + lx * cosR - ly * sinR, cy + lx * sinR + ly * cosR]);
  }
  return pts;
}

/**
 * Builds a hand-drawn quadratic curve from (x1,y1) via (cx,cy) to (x2,y2).
 */
export function buildHandQuadCurve(
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
  seedStr: string,
  roughness = 1.2
): Point[] {
  const rng = makeRng(seedStr);
  const steps = 26;
  const pts: Point[] = [];
  const phase = rng() * Math.PI * 2;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const inv = 1 - t;
    const bx = inv * inv * x1 + 2 * inv * t * cx + t * t * x2;
    const by = inv * inv * y1 + 2 * inv * t * cy + t * t * y2;
    const taper = Math.sin(t * Math.PI);
    const jx = (Math.sin(t * 9 + phase) * 0.7 + (rng() - 0.5) * 0.6) * roughness * taper;
    const jy = (Math.cos(t * 7 + phase) * 0.7 + (rng() - 0.5) * 0.6) * roughness * taper;
    pts.push([bx + jx, by + jy]);
  }
  return pts;
}

/**
 * Smooths arbitrary freehand control points into a complete hand-drawn stroke
 * without dropping endpoints.
 */
export function buildFreehandPoints(
  pointsStr: string | undefined,
  fallbackX: number,
  fallbackY: number,
  seedStr: string
): Point[] {
  if (!pointsStr) {
    return buildHandLine(fallbackX, fallbackY, fallbackX + 90, fallbackY, seedStr);
  }

  const raw: Point[] = pointsStr
    .split(/[;|]+/)
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [xs, ys] = pair.split(/[,\s]+/).map(Number);
      return [
        Number.isFinite(xs) ? xs : fallbackX,
        Number.isFinite(ys) ? ys : fallbackY,
      ] as Point;
    });

  if (raw.length === 0) {
    return buildHandLine(fallbackX, fallbackY, fallbackX + 90, fallbackY, seedStr);
  }
  if (raw.length === 1) {
    return [raw[0], [raw[0][0] + 4, raw[0][1] + 2]];
  }
  if (raw.length === 2) {
    return buildHandLine(raw[0][0], raw[0][1], raw[1][0], raw[1][1], seedStr, 1.3);
  }

  // Smooth piecewise segments cleanly through every point
  const out: Point[] = [raw[0]];
  for (let i = 0; i < raw.length - 1; i++) {
    const seg = buildHandLine(raw[i][0], raw[i][1], raw[i + 1][0], raw[i + 1][1], `${seedStr}_seg_${i}`, 1.1);
    for (let j = 1; j < seg.length; j++) {
      out.push(seg[j]);
    }
  }
  return out;
}

/**
 * Generates light diagonal notebook-style pen shading lines inside a bounding box.
 */
export function buildRectHatchStrokes(
  x: number,
  y: number,
  w: number,
  h: number,
  seedStr: string,
  spacing = 12
): Point[][] {
  const strokes: Point[][] = [];
  const pad = 6;
  const maxD = w + h;
  let idx = 0;
  for (let d = spacing; d < maxD - spacing; d += spacing) {
    const x1 = Math.max(x + pad, x + d - (h - pad));
    const y1 = Math.min(y + h - pad, y + d);
    const x2 = Math.min(x + w - pad, x + d - pad);
    const y2 = Math.max(y + pad, y + d - (w - pad));
    if (x2 > x1 + 4 && y1 > y2 + 4) {
      strokes.push(buildHandLine(x1, y1, x2, y2, `${seedStr}_h_${idx++}`, 1.0));
    }
  }
  return strokes;
}

export function pointsToSmoothPath(pts: Point[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  if (pts.length === 2) {
    return `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} L ${pts[1][0].toFixed(1)} ${pts[1][1].toFixed(1)}`;
  }

  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
  return d;
}

function strokeLength(pts: Point[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return Math.max(1, len);
}

export function sliceStrokesAtProgress(
  strokes: Point[][],
  p: number
): { visible: Point[][]; tip: Point } {
  const clamped = Math.max(0, Math.min(1, p));
  if (!strokes.length || !strokes[0].length) {
    return { visible: [], tip: [180, 180] };
  }
  if (clamped <= 0) {
    return { visible: [], tip: strokes[0][0] };
  }

  const lengths = strokes.map(strokeLength);
  const totalLen = lengths.reduce((a, b) => a + b, 0);
  if (clamped >= 1) {
    const lastStroke = strokes[strokes.length - 1];
    return {
      visible: strokes,
      tip: lastStroke[lastStroke.length - 1],
    };
  }

  let remaining = totalLen * clamped;
  const visible: Point[][] = [];
  let tip: Point = strokes[0][0];

  for (let s = 0; s < strokes.length; s++) {
    const pts = strokes[s];
    const sLen = lengths[s];
    if (remaining >= sLen) {
      visible.push(pts);
      tip = pts[pts.length - 1];
      remaining -= sLen;
    } else if (remaining > 0) {
      const partial: Point[] = [pts[0]];
      tip = pts[0];
      for (let i = 1; i < pts.length; i++) {
        const segLen = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (remaining >= segLen) {
          partial.push(pts[i]);
          tip = pts[i];
          remaining -= segLen;
        } else {
          const t = segLen > 0 ? remaining / segLen : 0;
          const ix = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t;
          const iy = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
          partial.push([ix, iy]);
          tip = [ix, iy];
          remaining = 0;
          break;
        }
      }
      visible.push(partial);
      break;
    } else {
      break;
    }
  }

  return { visible, tip };
}

/**
 * Resolves 3 valid, non-degenerate triangle vertices even if Gemini omits cx/cy.
 */
export function resolveTriangleVertices(cmd: DrawCommand): {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
} {
  const x1 = cmd.x;
  const y1 = cmd.y;
  let x2 = cmd.x2 ?? x1 + 190;
  let y2 = cmd.y2 ?? y1;
  let x3 = cmd.cx;
  let y3 = cmd.cy;

  // Check if x3/y3 are missing or collinear with (x1,y1)-(x2,y2)
  const cross =
    x3 !== undefined && y3 !== undefined
      ? Math.abs((x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1))
      : 0;

  if (x3 === undefined || y3 === undefined || cross < 250) {
    if (Math.abs(x2 - x1) < 12 && Math.abs(y2 - y1) > 20) {
      // Vertical leg given (x1==x2, y1!=y2): place 3rd vertex horizontally from bottom
      x3 = x1 + 210;
      y3 = Math.max(y1, y2);
    } else if (Math.abs(y2 - y1) < 12 && Math.abs(x2 - x1) > 20) {
      // Horizontal base given: place 3rd vertex above left corner
      x3 = x1;
      y3 = y1 - 140;
    } else {
      // Diagonal given: form clean right-angled triangle at corner (x1, y2)
      x3 = x1;
      y3 = y2;
      if (Math.abs(x2 - x1) < 20) {
        x2 = x1 + 190;
      }
    }
  }

  return { x1, y1, x2, y2, x3, y3 };
}

/**
 * Rich, crystal-clear hand-drawn notebook illustration library for `kind: "sketch"`.
 */
export function buildSketchAsset(cmd: DrawCommand, key: string): SketchAsset {
  const variant = (cmd.variant || 'plant').toLowerCase().trim();
  const w = Math.max(90, Math.min(360, cmd.width ?? 200));
  const h = Math.max(90, Math.min(300, cmd.height ?? 190));
  const x = cmd.x;
  const y = cmd.y;
  const cx = x + w / 2;
  const cy = y + h / 2;

  const strokes: Point[][] = [];
  const colors: string[] = [];
  const subLabels: SketchSubLabel[] = [];

  const pushStroke = (pts: Point[], c: string) => {
    strokes.push(pts);
    colors.push(c);
  };

  if (variant === 'plant' || variant === 'flower') {
    const soilY = y + h * 0.78;
    // Soil horizon & underground roots
    pushStroke(buildHandLine(x + w * 0.12, soilY, x + w * 0.88, soilY, `${key}_soil`, 1.5), '#D97706');
    pushStroke(buildHandQuadCurve(cx, soilY, cx - 18, soilY + 20, cx - 34, soilY + 34, `${key}_r1`, 1.2), '#38BDF8');
    pushStroke(buildHandQuadCurve(cx, soilY + 4, cx + 18, soilY + 22, cx + 32, soilY + 34, `${key}_r2`, 1.2), '#38BDF8');
    pushStroke(buildHandLine(cx, soilY, cx, soilY + 36, `${key}_r3`, 1.1), '#38BDF8');
    // Stem
    const topY = y + h * 0.24;
    pushStroke(buildHandQuadCurve(cx, soilY, cx - 5, (soilY + topY) / 2, cx, topY, `${key}_stem`, 1.1), '#34D399');
    // Left leaf (upper & lower edge + midrib)
    const ly = y + h * 0.54;
    pushStroke(buildHandQuadCurve(cx, ly, cx - w * 0.24, ly - 32, cx - w * 0.34, ly - 8, `${key}_ll1`, 1.1), '#34D399');
    pushStroke(buildHandQuadCurve(cx, ly, cx - w * 0.2, ly + 18, cx - w * 0.34, ly - 8, `${key}_ll2`, 1.1), '#34D399');
    pushStroke(buildHandLine(cx, ly, cx - w * 0.26, ly - 6, `${key}_lm`, 0.8), '#6EE7B7');
    // Right leaf
    const ry = y + h * 0.44;
    pushStroke(buildHandQuadCurve(cx, ry, cx + w * 0.24, ry - 32, cx + w * 0.34, ry - 8, `${key}_rl1`, 1.1), '#34D399');
    pushStroke(buildHandQuadCurve(cx, ry, cx + w * 0.2, ry + 18, cx + w * 0.34, ry - 8, `${key}_rl2`, 1.1), '#34D399');
    pushStroke(buildHandLine(cx, ry, cx + w * 0.26, ry - 6, `${key}_rm`, 0.8), '#6EE7B7');
    // Top sprout/flower bud
    pushStroke(buildHandEllipse(cx, topY - 12, 13, 13, `${key}_top`, 1.2), '#FBBF24');
    return { strokes, colors, subLabels };
  }

  if (variant === 'leaf' || variant === 'chloroplast') {
    const left = x + w * 0.1;
    const right = x + w * 0.9;
    pushStroke(buildHandQuadCurve(left, cy, cx, y + h * 0.12, right, cy, `${key}_top`, 1.3), '#34D399');
    pushStroke(buildHandQuadCurve(left, cy, cx, y + h * 0.88, right, cy, `${key}_bot`, 1.3), '#34D399');
    // Midrib + veins
    pushStroke(buildHandLine(left - 14, cy + 6, right - 10, cy, `${key}_mid`, 1.0), '#6EE7B7');
    for (const frac of [0.32, 0.5, 0.68]) {
      const vx = left + (right - left) * frac;
      pushStroke(buildHandLine(vx, cy, vx + 22, cy - h * 0.22, `${key}_vu_${frac}`, 0.9), '#6EE7B7');
      pushStroke(buildHandLine(vx, cy, vx + 22, cy + h * 0.22, `${key}_vd_${frac}`, 0.9), '#6EE7B7');
    }
    return { strokes, colors, subLabels };
  }

  if (variant === 'cloud' || variant === 'rain') {
    const base = y + h * 0.62;
    pushStroke(buildHandLine(x + w * 0.22, base, x + w * 0.78, base, `${key}_cb`, 1.2), '#38BDF8');
    pushStroke(buildHandQuadCurve(x + w * 0.22, base, x + w * 0.08, base - 28, x + w * 0.3, y + h * 0.34, `${key}_cl`, 1.3), '#38BDF8');
    pushStroke(buildHandQuadCurve(x + w * 0.3, y + h * 0.34, cx, y + h * 0.12, x + w * 0.66, y + h * 0.32, `${key}_ct`, 1.3), '#38BDF8');
    pushStroke(buildHandQuadCurve(x + w * 0.66, y + h * 0.32, x + w * 0.92, base - 28, x + w * 0.78, base, `${key}_cr`, 1.3), '#38BDF8');
    // Diagonal raindrops
    for (const dx of [0.28, 0.44, 0.6, 0.74]) {
      const rx = x + w * dx;
      pushStroke(buildHandLine(rx, base + 12, rx - 8, base + 36, `${key}_rn_${dx}`, 1.0), '#60A5FA');
    }
    return { strokes, colors, subLabels };
  }

  if (variant === 'water' || variant === 'drop' || variant === 'wave') {
    // Crisp water droplet + gentle surface ripple
    const tipY = y + h * 0.14;
    const bellyY = y + h * 0.62;
    pushStroke(buildHandQuadCurve(cx, tipY, x + w * 0.24, bellyY - 10, x + w * 0.3, bellyY + 8, `${key}_dl`, 1.2), '#38BDF8');
    pushStroke(buildHandQuadCurve(x + w * 0.3, bellyY + 8, cx, y + h * 0.88, x + w * 0.7, bellyY + 8, `${key}_db`, 1.2), '#38BDF8');
    pushStroke(buildHandQuadCurve(x + w * 0.7, bellyY + 8, x + w * 0.76, bellyY - 10, cx, tipY, `${key}_dr`, 1.2), '#38BDF8');
    pushStroke(buildHandQuadCurve(cx - 14, bellyY + 6, cx - 10, bellyY + 20, cx + 4, bellyY + 24, `${key}_shine`, 0.9), '#BAE6FD');
    return { strokes, colors, subLabels };
  }

  if (variant === 'atom') {
    const rx = w * 0.42;
    const ry = h * 0.16;
    pushStroke(buildHandEllipse(cx, cy, 14, 14, `${key}_nuc`, 1.2), '#F87171');
    pushStroke(buildHandEllipse(cx, cy, rx, ry, `${key}_o1`, 1.2, 0.52), '#38BDF8');
    pushStroke(buildHandEllipse(cx, cy, rx, ry, `${key}_o2`, 1.2, -0.52), '#A78BFA');
    pushStroke(buildHandEllipse(cx, cy, rx, ry, `${key}_o3`, 1.2, 1.57), '#34D399');
    subLabels.push({ text: '+', x: cx, y: cy + 5, color: '#FEE2E2' });
    return { strokes, colors, subLabels };
  }

  if (variant === 'cell') {
    // Cell outer membrane, inner nucleus, nucleolus, mitochondria
    pushStroke(buildHandEllipse(cx, cy, w * 0.44, h * 0.38, `${key}_mem`, 1.6), '#34D399');
    pushStroke(buildHandEllipse(cx - w * 0.08, cy - h * 0.04, w * 0.16, h * 0.15, `${key}_nuc`, 1.3), '#A78BFA');
    pushStroke(buildHandEllipse(cx - w * 0.08, cy - h * 0.04, 8, 8, `${key}_ncl`, 1.0), '#C4B5FD');
    pushStroke(buildHandEllipse(cx + w * 0.2, cy + h * 0.1, 22, 11, `${key}_mit1`, 1.1, 0.35), '#FBBF24');
    pushStroke(buildHandEllipse(cx + w * 0.16, cy - h * 0.16, 18, 10, `${key}_mit2`, 1.1, -0.4), '#38BDF8');
    return { strokes, colors, subLabels };
  }

  if (variant === 'dna') {
    const amp = w * 0.24;
    const top = y + h * 0.1;
    const bot = y + h * 0.9;
    const s1: Point[] = [];
    const s2: Point[] = [];
    const stepsCount = 32;
    for (let i = 0; i <= stepsCount; i++) {
      const u = i / stepsCount;
      const py = top + (bot - top) * u;
      const ang = u * Math.PI * 2.4;
      s1.push([cx + Math.sin(ang) * amp, py]);
      s2.push([cx - Math.sin(ang) * amp, py]);
    }
    pushStroke(s1, '#38BDF8');
    pushStroke(s2, '#A78BFA');
    for (const u of [0.14, 0.3, 0.48, 0.66, 0.84]) {
      const py = top + (bot - top) * u;
      const ang = u * Math.PI * 2.4;
      const xA = cx + Math.sin(ang) * amp;
      const xB = cx - Math.sin(ang) * amp;
      pushStroke(buildHandLine(xA, py, xB, py, `${key}_rung_${u}`, 0.9), '#34D399');
    }
    return { strokes, colors, subLabels };
  }

  if (variant === 'beaker' || variant === 'flask') {
    const neckW = w * 0.22;
    const baseW = w * 0.64;
    const topY = y + h * 0.14;
    const neckY = y + h * 0.38;
    const botY = y + h * 0.86;
    // Flask silhouette
    pushStroke(buildHandLine(cx - neckW / 2 - 6, topY, cx + neckW / 2 + 6, topY, `${key}_lip`, 1.0), '#F8FAFC');
    pushStroke(buildHandLine(cx - neckW / 2, topY, cx - neckW / 2, neckY, `${key}_nl`, 1.0), '#F8FAFC');
    pushStroke(buildHandLine(cx - neckW / 2, neckY, cx - baseW / 2, botY, `${key}_bl`, 1.2), '#F8FAFC');
    pushStroke(buildHandLine(cx - baseW / 2, botY, cx + baseW / 2, botY, `${key}_bot`, 1.2), '#F8FAFC');
    pushStroke(buildHandLine(cx + baseW / 2, botY, cx + neckW / 2, neckY, `${key}_br`, 1.2), '#F8FAFC');
    pushStroke(buildHandLine(cx + neckW / 2, neckY, cx + neckW / 2, topY, `${key}_nr`, 1.0), '#F8FAFC');
    // Liquid meniscus + bubbles
    const liqY = y + h * 0.64;
    pushStroke(buildHandQuadCurve(cx - baseW * 0.36, liqY, cx, liqY + 8, cx + baseW * 0.36, liqY, `${key}_liq`, 1.0), '#38BDF8');
    pushStroke(buildHandEllipse(cx - 14, liqY + 22, 6, 6, `${key}_bub1`, 1.0), '#38BDF8');
    pushStroke(buildHandEllipse(cx + 12, liqY + 14, 5, 5, `${key}_bub2`, 1.0), '#34D399');
    return { strokes, colors, subLabels };
  }

  if (variant === 'prism') {
    // Triangular glass prism + incoming white ray + dispersed rainbow rays
    const pTop: Point = [cx, y + h * 0.16];
    const pLeft: Point = [cx - w * 0.24, y + h * 0.82];
    const pRight: Point = [cx + w * 0.24, y + h * 0.82];
    pushStroke(buildHandLine(pTop[0], pTop[1], pLeft[0], pLeft[1], `${key}_pl`, 1.2), '#E2E8F0');
    pushStroke(buildHandLine(pLeft[0], pLeft[1], pRight[0], pRight[1], `${key}_pb`, 1.2), '#E2E8F0');
    pushStroke(buildHandLine(pRight[0], pRight[1], pTop[0], pTop[1], `${key}_pr`, 1.2), '#E2E8F0');
    // Incoming white ray
    const hitIn: Point = [cx - w * 0.11, y + h * 0.52];
    pushStroke(buildHandLine(x + 6, y + h * 0.62, hitIn[0], hitIn[1], `${key}_in`, 1.0), '#F8FAFC');
    // Refracted rays inside & exiting in red, amber, green, blue, violet
    const hitOut: Point = [cx + w * 0.11, y + h * 0.54];
    pushStroke(buildHandLine(hitIn[0], hitIn[1], hitOut[0], hitOut[1], `${key}_mid`, 0.9), '#CBD5E1');
    const spectrum = ['#F87171', '#FBBF24', '#34D399', '#38BDF8', '#A78BFA'];
    spectrum.forEach((col, i) => {
      pushStroke(
        buildHandLine(hitOut[0], hitOut[1] + (i - 2) * 3, x + w - 8, y + h * 0.42 + i * 16, `${key}_sp_${i}`, 1.0),
        col
      );
    });
    return { strokes, colors, subLabels };
  }

  if (variant === 'magnet') {
    const leftX = cx - 44;
    const rightX = cx + 44;
    const topY = y + h * 0.2;
    const curveY = y + h * 0.58;
    // U-magnet outer & inner horseshoe
    pushStroke(buildHandLine(leftX - 18, topY, leftX - 18, curveY, `${key}_ol`, 1.1), '#F87171');
    pushStroke(buildHandQuadCurve(leftX - 18, curveY, cx, y + h * 0.95, rightX + 18, curveY, `${key}_ob`, 1.2), '#94A3B8');
    pushStroke(buildHandLine(rightX + 18, curveY, rightX + 18, topY, `${key}_or`, 1.1), '#38BDF8');
    pushStroke(buildHandLine(leftX + 12, topY, leftX + 12, curveY, `${key}_il`, 1.1), '#F87171');
    pushStroke(buildHandQuadCurve(leftX + 12, curveY, cx, y + h * 0.74, rightX - 12, curveY, `${key}_ib`, 1.2), '#94A3B8');
    pushStroke(buildHandLine(rightX - 12, curveY, rightX - 12, topY, `${key}_ir`, 1.1), '#38BDF8');
    pushStroke(buildHandLine(leftX - 18, topY, leftX + 12, topY, `${key}_tl`, 0.8), '#F87171');
    pushStroke(buildHandLine(rightX - 12, topY, rightX + 18, topY, `${key}_tr`, 0.8), '#38BDF8');
    // Field lines above poles
    pushStroke(buildHandQuadCurve(leftX, topY - 4, cx, topY - 42, rightX, topY - 4, `${key}_f1`, 1.0), '#FBBF24');
    pushStroke(buildHandQuadCurve(leftX - 8, topY - 4, cx, topY - 64, rightX + 8, topY - 4, `${key}_f2`, 1.0), '#FBBF24');
    subLabels.push({ text: 'N', x: leftX - 3, y: topY + 26, color: '#FCA5A5' });
    subLabels.push({ text: 'S', x: rightX + 3, y: topY + 26, color: '#7DD3FC' });
    return { strokes, colors, subLabels };
  }

  if (variant === 'circuit' || variant === 'bulb') {
    const left = x + w * 0.16;
    const right = x + w * 0.84;
    const top = y + h * 0.24;
    const bot = y + h * 0.78;
    // Wires loop
    pushStroke(buildHandLine(left, cy - 18, left, top, `${key}_w1`, 1.1), '#38BDF8');
    pushStroke(buildHandLine(left, top, cx - 22, top, `${key}_w2`, 1.1), '#38BDF8');
    pushStroke(buildHandLine(cx + 22, top, right, top, `${key}_w3`, 1.1), '#38BDF8');
    pushStroke(buildHandLine(right, top, right, bot, `${key}_w4`, 1.1), '#38BDF8');
    pushStroke(buildHandLine(right, bot, left, bot, `${key}_w5`, 1.1), '#38BDF8');
    pushStroke(buildHandLine(left, bot, left, cy + 18, `${key}_w6`, 1.1), '#38BDF8');
    // Battery plates on left
    pushStroke(buildHandLine(left - 18, cy - 10, left + 18, cy - 10, `${key}_bp`, 0.9), '#F87171');
    pushStroke(buildHandLine(left - 10, cy + 8, left + 10, cy + 8, `${key}_bn`, 0.9), '#94A3B8');
    // Glowing bulb on top
    pushStroke(buildHandEllipse(cx, top, 22, 22, `${key}_bulb`, 1.2), '#FBBF24');
    pushStroke(buildHandLine(cx - 10, top - 10, cx + 10, top + 10, `${key}_fx1`, 0.8), '#FDE68A');
    pushStroke(buildHandLine(cx - 10, top + 10, cx + 10, top - 10, `${key}_fx2`, 0.8), '#FDE68A');
    subLabels.push({ text: '+', x: left - 26, y: cy - 6, color: '#F87171' });
    subLabels.push({ text: '−', x: left - 24, y: cy + 14, color: '#94A3B8' });
    return { strokes, colors, subLabels };
  }

  if (variant === 'planet' || variant === 'solar' || variant === 'globe') {
    const r = Math.min(w, h) * 0.28;
    pushStroke(buildHandEllipse(cx, cy, r, r, `${key}_pl`, 1.4), '#38BDF8');
    pushStroke(buildHandEllipse(cx, cy, r * 1.95, r * 0.45, `${key}_ring`, 1.3, -0.28), '#FBBF24');
    // Subtle equator/meridian arc
    pushStroke(buildHandQuadCurve(cx - r * 0.6, cy - r * 0.2, cx, cy - r * 0.45, cx + r * 0.55, cy - r * 0.1, `${key}_band`, 1.0), '#7DD3FC');
    return { strokes, colors, subLabels };
  }

  if (variant === 'pendulum') {
    const pivX = cx;
    const pivY = y + h * 0.14;
    const bobX = cx + w * 0.24;
    const bobY = y + h * 0.68;
    // Support beam & dashed vertical equilibrium
    pushStroke(buildHandLine(cx - w * 0.28, pivY, cx + w * 0.28, pivY, `${key}_beam`, 1.0), '#94A3B8');
    pushStroke(buildHandLine(pivX, pivY, pivX, y + h * 0.78, `${key}_eq`, 0.9), '#64748B');
    // String & bob
    pushStroke(buildHandLine(pivX, pivY, bobX, bobY, `${key}_str`, 1.1), '#F8FAFC');
    pushStroke(buildHandEllipse(bobX, bobY + 14, 16, 16, `${key}_bob`, 1.2), '#FBBF24');
    // Swing arc
    pushStroke(buildHandQuadCurve(cx - w * 0.24, bobY + 10, cx, y + h * 0.88, bobX, bobY + 14, `${key}_arc`, 1.1), '#38BDF8');
    return { strokes, colors, subLabels };
  }

  if (variant === 'mountain' || variant === 'volcano') {
    const base = y + h * 0.82;
    pushStroke(buildHandLine(x + w * 0.08, base, x + w * 0.38, y + h * 0.24, `${key}_m1`, 1.4), '#94A3B8');
    pushStroke(buildHandLine(x + w * 0.38, y + h * 0.24, x + w * 0.58, base - 25, `${key}_m2`, 1.4), '#94A3B8');
    pushStroke(buildHandLine(x + w * 0.46, y + h * 0.54, x + w * 0.68, y + h * 0.28, `${key}_m3`, 1.4), '#CBD5E1');
    pushStroke(buildHandLine(x + w * 0.68, y + h * 0.28, x + w * 0.92, base, `${key}_m4`, 1.4), '#CBD5E1');
    pushStroke(buildHandLine(x + w * 0.05, base, x + w * 0.95, base, `${key}_mg`, 1.2), '#34D399');
    return { strokes, colors, subLabels };
  }

  if (variant === 'heart') {
    pushStroke(buildHandQuadCurve(cx, y + h * 0.34, cx - w * 0.28, y + h * 0.12, x + w * 0.16, y + h * 0.48, `${key}_hl1`, 1.2), '#F87171');
    pushStroke(buildHandQuadCurve(x + w * 0.16, y + h * 0.48, cx - w * 0.1, y + h * 0.72, cx, y + h * 0.86, `${key}_hl2`, 1.2), '#F87171');
    pushStroke(buildHandQuadCurve(cx, y + h * 0.34, cx + w * 0.28, y + h * 0.12, x + w * 0.84, y + h * 0.48, `${key}_hr1`, 1.2), '#F87171');
    pushStroke(buildHandQuadCurve(x + w * 0.84, y + h * 0.48, cx + w * 0.1, y + h * 0.72, cx, y + h * 0.86, `${key}_hr2`, 1.2), '#F87171');
    return { strokes, colors, subLabels };
  }

  if (variant === 'righttriangle') {
    const xA = x + w * 0.18;
    const yA = y + h * 0.16;
    const xB = x + w * 0.18;
    const yB = y + h * 0.82;
    const xC = x + w * 0.86;
    const yC = y + h * 0.82;
    pushStroke(buildHandLine(xA, yA, xB, yB, `${key}_legA`, 1.2), '#38BDF8');
    pushStroke(buildHandLine(xB, yB, xC, yC, `${key}_legB`, 1.2), '#34D399');
    pushStroke(buildHandLine(xC, yC, xA, yA, `${key}_hyp`, 1.2), '#FBBF24');
    // 90 degree right-angle corner square
    pushStroke(buildHandLine(xB, yB - 18, xB + 18, yB - 18, `${key}_sq1`, 0.7), '#F8FAFC');
    pushStroke(buildHandLine(xB + 18, yB - 18, xB + 18, yB, `${key}_sq2`, 0.7), '#F8FAFC');
    subLabels.push({ text: 'a', x: xA - 18, y: (yA + yB) / 2, color: '#38BDF8' });
    subLabels.push({ text: 'b', x: (xB + xC) / 2, y: yB + 22, color: '#34D399' });
    subLabels.push({ text: 'c', x: (xA + xC) / 2 + 16, y: (yA + yC) / 2 - 10, color: '#FBBF24' });
    return { strokes, colors, subLabels };
  }

  if (variant === 'molecule') {
    const r = Math.min(w, h) * 0.14;
    const smallR = r * 0.62;
    const lx = cx - r * 2.1;
    const ly = cy - r * 0.9;
    const rx = cx + r * 2.1;
    const ry = cy - r * 0.9;
    pushStroke(buildHandEllipse(cx, cy + r * 0.3, r, r, `${key}_mc`, 1.3), '#A78BFA');
    pushStroke(buildHandLine(cx - r * 0.7, cy - r * 0.25, lx + smallR * 0.7, ly + smallR * 0.45, `${key}_mb1`, 1.0), '#94A3B8');
    pushStroke(buildHandEllipse(lx, ly, smallR, smallR, `${key}_ma1`, 1.2), '#38BDF8');
    pushStroke(buildHandLine(cx + r * 0.7, cy - r * 0.25, rx - smallR * 0.7, ry + smallR * 0.45, `${key}_mb2`, 1.0), '#94A3B8');
    pushStroke(buildHandEllipse(rx, ry, smallR, smallR, `${key}_ma2`, 1.2), '#F87171');
    return { strokes, colors, subLabels };
  }

  if (variant === 'sun') {
    const r = Math.min(w, h) * 0.24;
    pushStroke(buildHandEllipse(cx, cy, r, r, `${key}_sun_core`, 1.4), '#FBBF24');
    const rayAngles = [0, 45, 90, 135, 180, 225, 270, 315];
    rayAngles.forEach((deg, idx) => {
      const rad = (deg * Math.PI) / 180;
      const r1 = r + 6;
      const r2 = r + (idx % 2 === 0 ? 20 : 13);
      pushStroke(
        buildHandLine(
          cx + Math.cos(rad) * r1,
          cy + Math.sin(rad) * r1,
          cx + Math.cos(rad) * r2,
          cy + Math.sin(rad) * r2,
          `${key}_sun_ray_${idx}`,
          1.0
        ),
        '#FDE68A'
      );
    });
    return { strokes, colors, subLabels };
  }

  if (variant === 'tree') {
    const baseY = y + h * 0.88;
    const trunkTopY = y + h * 0.5;
    const crownCy = y + h * 0.34;
    const rx = w * 0.36;
    const ry = h * 0.24;
    pushStroke(buildHandQuadCurve(cx - 14, baseY, cx - 6, (baseY + trunkTopY) / 2, cx - 5, trunkTopY, `${key}_tl`, 1.1), '#D97706');
    pushStroke(buildHandQuadCurve(cx + 14, baseY, cx + 6, (baseY + trunkTopY) / 2, cx + 5, trunkTopY, `${key}_tr`, 1.1), '#D97706');
    pushStroke(buildHandEllipse(cx, crownCy, rx, ry, `${key}_crown`, 1.5), '#34D399');
    return { strokes, colors, subLabels };
  }

  // Default fallback: clean notebook concept circle
  pushStroke(buildHandEllipse(cx, cy, Math.min(w, h) * 0.3, Math.min(w, h) * 0.3, `${key}_def`, 1.4), '#38BDF8');
  return { strokes, colors, subLabels };
}

/**
 * Builds the complete ordered list of human-sketched strokes for any DrawCommand.
 */
export function buildCommandStrokes(cmd: DrawCommand, key: string): Point[][] {
  switch (cmd.kind) {
    case 'line': {
      const x2 = cmd.x2 ?? cmd.x + 120;
      const y2 = cmd.y2 ?? cmd.y;
      return [buildHandLine(cmd.x, cmd.y, x2, y2, key, 1.3)];
    }

    case 'arrow': {
      const x2 = cmd.x2 ?? cmd.x + 120;
      const y2 = cmd.y2 ?? cmd.y;
      const angle = Math.atan2(y2 - cmd.y, x2 - cmd.x);
      const headLen = 13;
      const h1x = x2 - headLen * Math.cos(angle - Math.PI / 6);
      const h1y = y2 - headLen * Math.sin(angle - Math.PI / 6);
      const h2x = x2 - headLen * Math.cos(angle + Math.PI / 6);
      const h2y = y2 - headLen * Math.sin(angle + Math.PI / 6);
      return [
        buildHandLine(cmd.x, cmd.y, x2, y2, `${key}_shaft`, 1.2),
        buildHandLine(x2, y2, h1x, h1y, `${key}_h1`, 0.9),
        buildHandLine(x2, y2, h2x, h2y, `${key}_h2`, 0.9),
      ];
    }

    case 'rect':
    case 'highlight': {
      const w = cmd.width ?? 150;
      const h = cmd.height ?? 80;
      const rng = makeRng(`${key}_overshoot`);
      const ov = () => (rng() - 0.5) * 2.5;
      return [
        buildHandLine(cmd.x, cmd.y, cmd.x + w + ov(), cmd.y + ov(), `${key}_top`, 1.2),
        buildHandLine(cmd.x + w, cmd.y, cmd.x + w + ov(), cmd.y + h + ov(), `${key}_right`, 1.2),
        buildHandLine(cmd.x + w, cmd.y + h, cmd.x + ov(), cmd.y + h + ov(), `${key}_bot`, 1.2),
        buildHandLine(cmd.x, cmd.y + h, cmd.x + ov(), cmd.y + ov(), `${key}_left`, 1.2),
      ];
    }

    case 'circle': {
      const r = cmd.radius ?? 44;
      return [buildHandEllipse(cmd.x, cmd.y, r, r, key, 1.5)];
    }

    case 'ellipse': {
      const rx = cmd.rx ?? 68;
      const ry = cmd.ry ?? 38;
      return [buildHandEllipse(cmd.x, cmd.y, rx, ry, key, 1.5)];
    }

    case 'triangle': {
      const { x1, y1, x2, y2, x3, y3 } = resolveTriangleVertices(cmd);
      return [
        buildHandLine(x1, y1, x2, y2, `${key}_e1`, 1.2),
        buildHandLine(x2, y2, x3, y3, `${key}_e2`, 1.2),
        buildHandLine(x3, y3, x1, y1, `${key}_e3`, 1.2),
      ];
    }

    case 'curve': {
      const x2 = cmd.x2 ?? cmd.x + 160;
      const y2 = cmd.y2 ?? cmd.y;
      const cx = cmd.cx ?? (cmd.x + x2) / 2;
      const cy = cmd.cy ?? cmd.y - 80;
      return [buildHandQuadCurve(cmd.x, cmd.y, cx, cy, x2, y2, key, 1.2)];
    }

    case 'axes': {
      const w = cmd.width ?? 360;
      const h = cmd.height ?? 250;
      const midX = cmd.x + w / 2;
      const midY = cmd.y + h / 2;
      const strokes: Point[][] = [
        buildHandLine(midX, cmd.y + h, midX, cmd.y, `${key}_y`, 1.1),
        buildHandLine(midX - 6, cmd.y + 10, midX, cmd.y, `${key}_ya1`, 0.7),
        buildHandLine(midX, cmd.y, midX + 6, cmd.y + 10, `${key}_ya2`, 0.7),
        buildHandLine(cmd.x, midY, cmd.x + w, midY, `${key}_x`, 1.1),
        buildHandLine(cmd.x + w - 10, midY - 6, cmd.x + w, midY, `${key}_xa1`, 0.7),
        buildHandLine(cmd.x + w, midY, cmd.x + w - 10, midY + 6, `${key}_xa2`, 0.7),
      ];
      const tickStep = Math.max(38, Math.round(w / 8));
      for (let dx = tickStep; dx < w / 2 - 22; dx += tickStep) {
        strokes.push(buildHandLine(midX + dx, midY - 4, midX + dx, midY + 4, `${key}_txp_${dx}`, 0.5));
        strokes.push(buildHandLine(midX - dx, midY - 4, midX - dx, midY + 4, `${key}_txn_${dx}`, 0.5));
      }
      for (let dy = tickStep; dy < h / 2 - 22; dy += tickStep) {
        strokes.push(buildHandLine(midX - 4, midY - dy, midX + 4, midY - dy, `${key}_typ_${dy}`, 0.5));
        strokes.push(buildHandLine(midX - 4, midY + dy, midX + 4, midY + dy, `${key}_tyn_${dy}`, 0.5));
      }
      return strokes;
    }

    case 'parabola': {
      const w = cmd.width ?? 240;
      const h = cmd.height ?? 180;
      const rng = makeRng(key);
      const pts: Point[] = [];
      const stepsCount = 34;
      for (let i = 0; i <= stepsCount; i++) {
        const u = i / stepsCount;
        const t = u * 2 - 1;
        pts.push([
          cmd.x + w * u + (rng() - 0.5) * 0.9,
          cmd.y + h * (1 - t * t) + (rng() - 0.5) * 0.9,
        ]);
      }
      return [pts];
    }

    case 'sine': {
      const w = cmd.width ?? 320;
      const h = cmd.height ?? 140;
      const rng = makeRng(key);
      const pts: Point[] = [];
      const stepsCount = 44;
      for (let i = 0; i <= stepsCount; i++) {
        const u = i / stepsCount;
        pts.push([
          cmd.x + w * u + (rng() - 0.5) * 0.8,
          cmd.y + h * 0.5 - Math.sin(u * Math.PI * 2) * (h * 0.38) + (rng() - 0.5) * 0.9,
        ]);
      }
      return [pts];
    }

    case 'sun': {
      const r = cmd.radius ?? 32;
      const strokes: Point[][] = [buildHandEllipse(cmd.x, cmd.y, r, r, `${key}_core`, 1.5)];
      const rayAngles = [0, 45, 90, 135, 180, 225, 270, 315];
      rayAngles.forEach((deg, idx) => {
        const rad = (deg * Math.PI) / 180;
        const r1 = r + 7;
        const r2 = r + (idx % 2 === 0 ? 22 : 15);
        strokes.push(
          buildHandLine(
            cmd.x + Math.cos(rad) * r1,
            cmd.y + Math.sin(rad) * r1,
            cmd.x + Math.cos(rad) * r2,
            cmd.y + Math.sin(rad) * r2,
            `${key}_ray_${idx}`,
            1.0
          )
        );
      });
      return strokes;
    }

    case 'tree': {
      const w = cmd.width ?? 150;
      const h = cmd.height ?? 190;
      const cx = cmd.x + w / 2;
      const baseY = cmd.y + h;
      const trunkTopY = cmd.y + h * 0.5;
      const crownCy = cmd.y + h * 0.34;
      const rx = w * 0.36;
      const ry = h * 0.24;

      const trunkLeft = buildHandQuadCurve(
        cx - 18,
        baseY,
        cx - 7,
        (baseY + trunkTopY) / 2,
        cx - 6,
        trunkTopY,
        `${key}_tl`,
        1.1
      );
      const trunkRight = buildHandQuadCurve(
        cx + 18,
        baseY,
        cx + 7,
        (baseY + trunkTopY) / 2,
        cx + 6,
        trunkTopY,
        `${key}_tr`,
        1.1
      );
      const branchLeft = buildHandLine(cx - 4, trunkTopY + 12, cx - w * 0.19, trunkTopY - 18, `${key}_bl`, 1.1);
      const branchRight = buildHandLine(cx + 4, trunkTopY + 8, cx + w * 0.19, trunkTopY - 22, `${key}_br`, 1.1);

      const rng = makeRng(`${key}_crown`);
      const crownPts: Point[] = [];
      const lobes = 7;
      const totalPts = 56;
      for (let i = 0; i <= totalPts; i++) {
        const u = i / totalPts;
        const theta = -Math.PI / 2 + u * Math.PI * 2.04;
        const scallop = 1 + 0.16 * Math.abs(Math.sin(u * Math.PI * lobes)) + (rng() - 0.5) * 0.035;
        crownPts.push([
          cx + Math.cos(theta) * rx * scallop,
          crownCy + Math.sin(theta) * ry * scallop,
        ]);
      }

      const leaf1 = buildHandQuadCurve(cx - rx * 0.45, crownCy - 8, cx - rx * 0.25, crownCy - 20, cx - rx * 0.08, crownCy - 8, `${key}_lf1`, 0.9);
      const leaf2 = buildHandQuadCurve(cx + rx * 0.05, crownCy + 4, cx + rx * 0.26, crownCy - 8, cx + rx * 0.46, crownCy + 4, `${key}_lf2`, 0.9);

      return [trunkLeft, trunkRight, branchLeft, branchRight, crownPts, leaf1, leaf2];
    }

    case 'molecule': {
      const r = cmd.radius ?? 24;
      const leftX = cmd.x - r * 1.95;
      const leftY = cmd.y - r * 0.85;
      const rightX = cmd.x + r * 1.95;
      const rightY = cmd.y - r * 0.85;
      const smallR = Math.max(10, r * 0.52);

      return [
        buildHandEllipse(cmd.x, cmd.y, r, r, `${key}_c`, 1.3),
        buildHandLine(cmd.x - r * 0.72, cmd.y - r * 0.5, leftX + smallR * 0.72, leftY + smallR * 0.45, `${key}_b1`, 1.0),
        buildHandEllipse(leftX, leftY, smallR, smallR, `${key}_a1`, 1.2),
        buildHandLine(cmd.x + r * 0.72, cmd.y - r * 0.5, rightX - smallR * 0.72, rightY + smallR * 0.45, `${key}_b2`, 1.0),
        buildHandEllipse(rightX, rightY, smallR, smallR, `${key}_a2`, 1.2),
      ];
    }

    case 'underline': {
      const w = cmd.width && cmd.width > 0 ? cmd.width : cmd.x2 && cmd.x2 > cmd.x ? cmd.x2 - cmd.x : 180;
      const x2 = cmd.x2 && cmd.x2 > cmd.x ? cmd.x2 : cmd.x + w;
      const y2 = cmd.y2 && cmd.y2 > 0 ? cmd.y2 : cmd.y;
      return [
        buildHandLine(cmd.x, cmd.y, x2, y2, `${key}_u1`, 1.4),
        buildHandLine(cmd.x + 8, cmd.y + 6, x2 - 6, y2 + 6, `${key}_u2`, 1.2),
      ];
    }

    case 'freehand': {
      return [buildFreehandPoints(cmd.points, cmd.x, cmd.y, key)];
    }

    case 'sketch': {
      return buildSketchAsset(cmd, key).strokes;
    }

    default:
      return [];
  }
}

export function getTextTip(cmd: DrawCommand, p: number): Point {
  const clamped = Math.max(0, Math.min(1, p));
  const label = cmd.label || '';
  const fontSize = cmd.fontSize || 20;
  const approxWidth = Math.min(480, label.length * fontSize * 0.54);
  return [cmd.x + approxWidth * clamped, cmd.y - fontSize * 0.22];
}
