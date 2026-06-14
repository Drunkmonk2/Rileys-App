/* ============================================================================
 * tracing.js — trace-a-letter, recognized ON THE PHONE (nothing sent anywhere)
 * ----------------------------------------------------------------------------
 * How recognition works (no per-letter stroke data needed, works for A–Z & 0–9):
 *   1. Render the target character big onto a hidden "mask" canvas.
 *   2. Downsample the mask into a grid of cells that are "ink" vs "empty".
 *   3. As Riley drags her finger, mark which grid cells she touched.
 *   4. Score:
 *        coverage  = % of the letter's ink cells she actually traced over
 *        accuracy  = % of her touches that landed on the letter (not scribbling)
 *   5. Pass if coverage is high enough and she didn't scribble all over.
 * Thresholds are toddler-friendly (we want her to feel successful).
 * ==========================================================================*/

const Tracing = (() => {
  const GRID = 36;          // mask resolution (finer = stricter, fairer scoring)

  let guide, draw;          // visible canvases
  let maskCells;            // Set of "r,c" cells that are part of the letter
  let drawn;                // Set of every grid cell the child's finger touched
  let drawing = false, lastPt = null;
  let onComplete = null, char = "";
  let demoRAF = 0, demoActive = false;
  let drawnPts = [];        // pixel points the finger passed through (for scoring)

  function init(guideCanvas, drawCanvas) {
    guide = guideCanvas; draw = drawCanvas;
    const dpr = window.devicePixelRatio || 1;
    for (const c of [guide, draw]) {
      // clientWidth/Height ignore the screen's scale-in animation (a
      // getBoundingClientRect here would measure the mid-animation size).
      c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
      c.getContext("2d").scale(dpr, dpr);
    }
    bindPointer();
  }

  /* Load a new character to trace and draw the faded guide. */
  function setChar(ch, done) {
    char = ch; onComplete = done;
    drawn = new Set(); drawnPts = []; lastPt = null;
    cancelDemo();
    buildMask(ch);
    drawGuide(ch);
    drawMarks(ch);          // green start dot + direction arrows
    clearDrawing();
  }

  function size(c) { return { w: c.clientWidth, h: c.clientHeight }; }

  /* Stroke a glyph's polylines into ctx, scaled to a w×h box. */
  function pathStrokes(ctx, S, w, h) {
    S.forEach((stroke) => {
      ctx.beginPath();
      stroke.forEach((p, i) => (i ? ctx.lineTo(p[0] * w, p[1] * h) : ctx.moveTo(p[0] * w, p[1] * h)));
      ctx.stroke();
    });
  }

  /* Build the ink-cell mask. When we have stroke data we rasterize the SAME
   * strokes used for the guide/demo/arrows, so everything lines up perfectly.
   * Falls back to the font glyph for anything without stroke data. */
  function buildMask(ch) {
    const off = document.createElement("canvas");
    off.width = GRID; off.height = GRID;
    const x = off.getContext("2d");
    x.clearRect(0, 0, GRID, GRID);
    const S = strokesFor(ch);
    if (S) {
      x.strokeStyle = "#000"; x.lineCap = "round"; x.lineJoin = "round";
      // thin CENTERLINE for scoring: she must trace down the middle of the
      // letter, not just anywhere inside the wide guide, to earn the stars.
      x.lineWidth = GRID * 0.05;
      pathStrokes(x, S, GRID, GRID);
    } else {
      x.fillStyle = "#000"; x.textAlign = "center"; x.textBaseline = "middle";
      x.font = `800 ${GRID * 0.74}px "Baloo 2", system-ui, sans-serif`;
      x.fillText(ch, GRID / 2, GRID / 2 + GRID * 0.03);
    }
    const data = x.getImageData(0, 0, GRID, GRID).data;
    maskCells = new Set();
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (data[(r * GRID + c) * 4 + 3] > 60) maskCells.add(r + "," + c);
      }
    }
  }

  /* The faded path Riley traces on top of — drawn from the stroke data so it
   * exactly matches the demo and arrows (font fallback if no stroke data). */
  function drawGuide(ch) {
    const ctx = guide.getContext("2d");
    const { w, h } = size(guide);
    ctx.clearRect(0, 0, w, h);
    const S = strokesFor(ch);
    if (S) {
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(18, w * 0.11);            // "road" to trace on
      ctx.strokeStyle = "rgba(255,95,162,0.26)";
      pathStrokes(ctx, S, w, h);
      ctx.lineWidth = 2; ctx.setLineDash([8, 9]);        // dashed center line to follow
      ctx.strokeStyle = "rgba(230,57,138,0.55)";
      pathStrokes(ctx, S, w, h);
      ctx.setLineDash([]);
    } else {
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `800 ${h * 0.74}px "Baloo 2", system-ui, sans-serif`;
      ctx.fillStyle = "rgba(255,95,162,0.30)";
      ctx.fillText(ch, w / 2, h / 2 + h * 0.03);
    }
  }

  function clearDrawing() {
    const ctx = draw.getContext("2d");
    const { w, h } = size(draw);
    ctx.clearRect(0, 0, w, h);
  }

  /* ---- handwriting guidance: start dot, arrows, and animated demo --------*/
  function strokesFor(ch) {
    return (typeof STROKES !== "undefined" && STROKES[ch]) ? STROKES[ch] : null;
  }
  function drawArrow(ctx, x1, y1, x2, y2, sz) {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.save(); ctx.translate(x2, y2); ctx.rotate(ang);
    ctx.fillStyle = "rgba(230,57,138,0.6)";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-sz, -sz * 0.6);
    ctx.lineTo(-sz, sz * 0.6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // Draw the green start dot + a few direction arrowheads onto the guide.
  function drawMarks(ch) {
    const S = strokesFor(ch); if (!S) return;
    const ctx = guide.getContext("2d");
    const { w, h } = size(guide);
    const sz = Math.max(7, w * 0.022);
    S.forEach((stroke, si) => {
      const stepN = Math.max(1, Math.floor((stroke.length - 1) / 2));
      for (let i = stepN; i < stroke.length; i += stepN) {
        const a = stroke[i - 1], b = stroke[i];
        drawArrow(ctx, a[0] * w, a[1] * h, b[0] * w, b[1] * h, sz);
      }
      if (si === 0) {
        const p = stroke[0], r = Math.max(9, w * 0.032);
        ctx.fillStyle = "#38d39f";
        ctx.beginPath(); ctx.arc(p[0] * w, p[1] * h, r, 0, 7); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = `700 ${r}px system-ui, sans-serif`;
        ctx.fillText("▶", p[0] * w, p[1] * h);
      }
    });
  }
  function flatten(S, w, h) {
    const pts = [];
    S.forEach((stroke) => stroke.forEach((p, i) => {
      if (i === 0) { pts.push({ x: p[0] * w, y: p[1] * h, pen: false }); return; }
      const a = stroke[i - 1], steps = 6;
      for (let k = 1; k <= steps; k++) {
        const f = k / steps;
        pts.push({ x: (a[0] + (p[0] - a[0]) * f) * w, y: (a[1] + (p[1] - a[1]) * f) * h, pen: true });
      }
    }));
    return pts;
  }
  function cancelDemo() { if (demoRAF) cancelAnimationFrame(demoRAF); demoRAF = 0; demoActive = false; }
  // Animate a green dot writing the character so Riley sees the strokes.
  function demo(ch) {
    const S = strokesFor(ch || char); if (!S) return;
    cancelDemo(); demoActive = true;
    const ctx = draw.getContext("2d");
    const { w, h } = size(draw);
    const pts = flatten(S, w, h);
    let idx = 0;
    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(12, w * 0.045); ctx.strokeStyle = "rgba(255,95,162,0.9)";
      ctx.beginPath();
      for (let i = 0; i <= idx && i < pts.length; i++) {
        const p = pts[i];
        if (!p.pen) { ctx.stroke(); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      const cur = pts[Math.min(idx, pts.length - 1)];
      ctx.fillStyle = "#38d39f";
      ctx.beginPath(); ctx.arc(cur.x, cur.y, Math.max(9, w * 0.03), 0, 7); ctx.fill();
      idx += 2;
      if (idx < pts.length + 2) demoRAF = requestAnimationFrame(frame);
      else { demoActive = false; setTimeout(() => { if (!demoActive) clearDrawing(); }, 700); }
    };
    frame();
  }

  function ptFromEvent(e) {
    const rect = draw.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }

  function cellOf(pt) {
    const { w, h } = size(draw);
    const c = Math.floor((pt.x / w) * GRID);
    const r = Math.floor((pt.y / h) * GRID);
    return { r, c };
  }

  function record(pt) {
    drawnPts.push({ x: pt.x, y: pt.y });
    const { r, c } = cellOf(pt);
    if (r < 0 || c < 0 || r >= GRID || c >= GRID) return;
    drawn.add(r + "," + c);
  }
  function near(set, r, c, radius) {
    for (let dr = -radius; dr <= radius; dr++)
      for (let dc = -radius; dc <= radius; dc++)
        if (set.has((r + dr) + "," + (c + dc))) return true;
    return false;
  }

  function strokeTo(pt) {
    const ctx = draw.getContext("2d");
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(14, size(draw).w * 0.05);
    ctx.strokeStyle = "#ff5fa2";
    ctx.beginPath();
    ctx.moveTo(lastPt ? lastPt.x : pt.x, lastPt ? lastPt.y : pt.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPt = pt;
  }

  function bindPointer() {
    const start = (e) => { e.preventDefault();
      if (demoActive) { cancelDemo(); clearDrawing(); }   // clear the demo trail
      drawing = true; lastPt = null;
      const p = ptFromEvent(e); record(p); strokeTo(p); };
    const move = (e) => { if (!drawing) return; e.preventDefault();
      const p = ptFromEvent(e); record(p); strokeTo(p); };
    const end = () => { if (!drawing) return; drawing = false; lastPt = null; };
    draw.addEventListener("touchstart", start, { passive: false });
    draw.addEventListener("touchmove", move, { passive: false });
    draw.addEventListener("touchend", end);
    draw.addEventListener("mousedown", start);
    draw.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
  }

  // distance (px) from a point to a line segment
  function distToSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx, cy = ay + t * dy;
    return Math.hypot(px - cx, py - cy);
  }
  // nearest distance (px) from a point to the whole glyph path
  function distToPath(px, py, S, w, h) {
    let best = Infinity;
    for (const stroke of S) {
      for (let i = 1; i < stroke.length; i++) {
        const d = distToSeg(px, py, stroke[i-1][0]*w, stroke[i-1][1]*h, stroke[i][0]*w, stroke[i][1]*h);
        if (d < best) best = d;
      }
    }
    return best;
  }
  // evenly-spaced sample points along the glyph path
  function samplePath(S, w, h, step) {
    const pts = [];
    for (const stroke of S) {
      for (let i = 1; i < stroke.length; i++) {
        const ax = stroke[i-1][0]*w, ay = stroke[i-1][1]*h, bx = stroke[i][0]*w, by = stroke[i][1]*h;
        const segLen = Math.hypot(bx - ax, by - ay);
        const n = Math.max(1, Math.round(segLen / step));
        for (let k = 0; k <= n; k++) {
          const f = k / n; pts.push({ x: ax + (bx-ax)*f, y: ay + (by-ay)*f });
        }
      }
    }
    return pts;
  }

  /* Called when child taps "Done". Scored on real pixel distance from the
   * letter's centerline, so stars are honest:
   *   accuracy = % of her finger points that stayed close to the line
   *   coverage = % of the line she actually traced over
   * Both must be good to earn 3 stars; sloppy/partial traces score lower. */
  function check() {
    const S = strokesFor(char);
    const { w, h } = size(draw);
    if (!S || drawnPts.length < 12) return { pass: false, stars: 0, coverage: 0, accuracy: 0 };

    const tol = Math.max(13, w * 0.05);      // how close counts as "on the line"
    let on = 0;
    for (const p of drawnPts) if (distToPath(p.x, p.y, S, w, h) <= tol) on++;
    const accuracy = on / drawnPts.length;

    const samples = samplePath(S, w, h, tol);
    let cov = 0;
    for (const s of samples) {
      if (drawnPts.some(p => (p.x - s.x) ** 2 + (p.y - s.y) ** 2 <= tol * tol)) cov++;
    }
    const coverage = samples.length ? cov / samples.length : 0;
    const overall = coverage * accuracy;

    const pass = coverage >= 0.6 && accuracy >= 0.6;
    const stars = !pass ? 0 : overall >= 0.82 ? 3 : overall >= 0.62 ? 2 : 1;
    return { pass, stars, coverage: Math.round(coverage * 100), accuracy: Math.round(accuracy * 100) };
  }

  function reset() { setChar(char, onComplete); }

  return { init, setChar, check, reset, demo };
})();
