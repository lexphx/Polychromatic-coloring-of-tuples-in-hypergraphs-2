const pad = 40;
let k = 3;
const k_choice = [3, 4, 5];
let cpts = 20;
const UNIT_R = 1;
const palette = [
  [10, 50, 255],
  [10, 255, 50],
  [255, 50, 50],
  [128, 128, 128],
  [230, 245, 40],
];
let view = { s: 1, ox: 0, oy: 0 };
let disk = { cx: 2, cy: 2, r: UNIT_R };
let pts = [];
let kSel;
let ptsInpt;
let ptColor = [];
let legend = "";
let probeMode = false;
let probeStats = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  kSel = createSelect();
  k_choice.forEach((v) => kSel.option(v));
  kSel.selected(k);
  kSel.position(windowWidth - kSel.width - 20, 10);
  pts = generateRandomPoints(cpts);
  recolorPoints();
  ptsInpt = createInput(cpts);
  ptsInpt.attribute("type", "number");
  ptsInpt.attribute("min", 5);
  ptsInpt.attribute("max", 200);
  ptsInpt.size(40);
  ptsInpt.position(windowWidth - ptsInpt.width - 50, 10);
  ptsInpt.changed(() => {
    const n = int(ptsInpt.value());
    pts = generateRandomPoints(n);
    recolorPoints();
    computeView();
    recolorPoints();
    computeView();
    probeMode = false;
    probeStats = false;
  });
  computeView();
}

function draw() {
  nk = kSel ? int(kSel.value()) : k;
  if (nk != k) {
    k = nk;
    recolorPoints();
    probeMode = false;
    probeStats = false;
  }
  background(255);
  noStroke();
  for (let i = 0; i < pts.length; i++) {
    const s = toScreen(pts[i]);
    const [r, g, b] = palette[ptColor[i] % palette.length];
    fill(r, g, b);
    circle(s.x, s.y, 6);
  }

  let worst;
  if (probeMode && probeStats) {
    // use the last clicked disk
    worst = probeStats;
  } else {
    // default: global worst unit disk
    worst = analyzeWorstMono();
  }
  if (worst.center) {
    const cW = toScreen(worst.center);
    const [r, g, b] = palette[worst.colorIndex % palette.length];
    noFill();
    stroke(r, g, b);
    strokeWeight(3);
    circle(cW.x, cW.y, 2 * UNIT_R * view.s);

    noStroke();
    for (const P of pts) {
      if (ptColor[pts.indexOf(P)] !== worst.colorIndex) continue;
      const dx = P.x - worst.center.x,
        dy = P.y - worst.center.y;
      if (dx * dx + dy * dy <= 1 + 1e-9) {
        const s = toScreen(P);
        const [r, g, b] = palette[worst.colorIndex % palette.length];
        fill(r, g, b, 90);
        circle(s.x, s.y, 12);
      }
    }

    noStroke();
    fill(20);
    textSize(14);
    const est = Math.sqrt(k * Math.log(k));
    const c = (worst.M * worst.M) / (k * Math.log(k));
    legend = `M = ${worst.M} | √(k ln k) ≈ ${est.toFixed(2)} | ĉ ≈ ${c.toFixed(
      2
    )}`;
    drawLegendBoxes();
  }
}

function drawLegendBoxes() {
  const x0 = 12,
    y0 = 14;
  textSize(14);
  textAlign(LEFT, CENTER);

  const padX = 8,
    padY = 6;
  const w = textWidth(legend) + 2 * padX;
  noStroke();
  fill(255, 230);
  rect(x0 - padX, y0 - padY, w, 24, 6);

  fill(20);
  text(legend, x0, y0 + 5);
}

windowResized = function () {
  resizeCanvas(windowWidth, windowHeight);
  computeView();
  kSel.position(windowWidth - kSel.width - 20, 10);
  ptsInpt.position(windowWidth - ptsInpt.width - 50, 10);
};

function computeView() {
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;
  for (const p of pts) {
    minX = min(minX, p.x);
    minY = min(minY, p.y);
    maxX = max(maxX, p.x);
    maxY = max(maxY, p.y);
  }
  const rangeX = maxX - minX || 1; // if all x are equal || 1
  const rangeY = maxY - minY || 1; // if all y are equal || 1
  // Uniform scale so everything fits
  const sx = (width - 2 * pad) / rangeX;
  const sy = (height - 2 * pad) / rangeY;
  const s = min(sx, sy);
  // Ranges
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  // Offsets so the data is centered
  const ox = width / 2 - s * cx;
  const oy = height / 2 - s * cy;

  view.s = s;
  view.ox = ox;
  view.oy = oy;
}

function toScreen(p) {
  return { x: view.s * p.x + view.ox, y: view.s * p.y + view.oy };
}

function fromScreen(x, y) {
  return {
    x: (x - view.ox) / view.s,
    y: (y - view.oy) / view.s,
  };
}

function generateRandomPoints(n, range = 3) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    pts.push({
      x: random(range),
      y: random(range),
    });
  }
  return pts;
}

function recolorPoints() {
  ptColor = pts.map(() => floor(random(k)));
}

function unitCentersThrough(A, B) {
  const dx = B.x - A.x,
    dy = B.y - A.y;
  const d2 = dx * dx + dy * dy,
    d = Math.sqrt(d2);
  if (d === 0 || d > 2) return [];
  const mx = (A.x + B.x) / 2,
    my = (A.y + B.y) / 2;
  const h = Math.sqrt(1 - (d / 2) ** 2);
  const ux = -dy / d,
    uy = dx / d;
  return [
    { x: mx + h * ux, y: my + h * uy },
    { x: mx - h * ux, y: my - h * uy },
  ];
}

function countInUnitDisk(points, cx, cy) {
  let cnt = 0;
  for (const P of points) {
    const dx = P.x - cx,
      dy = P.y - cy;
    if (dx * dx + dy * dy <= 1 + 1e-9) cnt++;
  }
  return cnt;
}

function worstMonoForColor(pointsOfColor) {
  if (pointsOfColor.length === 0) return { M: 0, center: null };
  let best = 1,
    bestC = { x: pointsOfColor[0].x, y: pointsOfColor[0].y };

  for (const A of pointsOfColor) {
    const c = { x: A.x, y: A.y };
    const m = countInUnitDisk(pointsOfColor, c.x, c.y);
    if (m > best) {
      best = m;
      bestC = c;
    }
  }
  for (let i = 0; i < pointsOfColor.length; i++) {
    for (let j = i + 1; j < pointsOfColor.length; j++) {
      const A = pointsOfColor[i],
        B = pointsOfColor[j];
      for (const c of unitCentersThrough(A, B)) {
        const m = countInUnitDisk(pointsOfColor, c.x, c.y);
        if (m > best) {
          best = m;
          bestC = c;
        }
      }
    }
  }
  return { M: best, center: bestC };
}

function analyzeWorstMono() {
  const buckets = Array.from({ length: k }, () => []);
  for (let i = 0; i < pts.length; i++) buckets[ptColor[i]].push(pts[i]);

  let worst = { M: 0, center: null, colorIndex: 0 };
  for (let ci = 0; ci < k; ci++) {
    const res = worstMonoForColor(buckets[ci]);
    if (res.M > worst.M) worst = { ...res, colorIndex: ci };
  }
  return worst;
}

function statsAtCenter(cx, cy) {
  const counts = Array(k).fill(0);

  for (let i = 0; i < pts.length; i++) {
    const P = pts[i];
    const dx = P.x - cx,
      dy = P.y - cy;
    if (dx * dx + dy * dy <= UNIT_R * UNIT_R + 1e-9) {
      counts[ptColor[i]]++;
    }
  }
  let bestM = 0,
    bestColor = 0;
  for (let c = 0; c < k; c++) {
    if (counts[c] > bestM) {
      bestM = counts[c];
      bestColor = c;
    }
  }
  return { M: bestM, colorIndex: bestColor, center: { x: cx, y: cy } };
}

function mousePressed() {
  // Ignore clicks on the UI controls
  const el = document.elementFromPoint(mouseX, mouseY);
  if (kSel && kSel.elt.contains(el)) return;
  if (ptsInpt && ptsInpt.elt.contains(el)) return;

  const w = fromScreen(mouseX, mouseY);
  disk.cx = w.x;
  disk.cy = w.y;
  probeStats = statsAtCenter(disk.cx, disk.cy);
  probeMode = true;
}
