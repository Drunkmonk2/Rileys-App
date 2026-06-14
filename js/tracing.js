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
  const GRID = 28;          // mask resolution (GRID x GRID cells)
  const PASS_COVERAGE = 0.55;
  const MAX_OFF = 0.55;     // allow lots of slop; little fingers wander

  let guide, draw;          // visible canvases
  let maskCells;            // Set of "r,c" cells that are part of the letter
  let drawn;                // Set of every grid cell the child's finger touched
  let drawing = false, lastPt = null;
  let onComplete = null, char = "";

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
    drawn = new Set(); lastPt = null;
    buildMask(ch);
    drawGuide(ch);
    clearDrawing();
  }

  function size(c) { return { w: c.clientWidth, h: c.clientHeight }; }

  /* Build the ink-cell mask by rendering the glyph to an offscreen canvas. */
  function buildMask(ch) {
    const { w, h } = size(guide);
    const off = document.createElement("canvas");
    off.width = GRID; off.height = GRID;
    const x = off.getContext("2d");
    x.clearRect(0, 0, GRID, GRID);
    x.fillStyle = "#000";
    x.textAlign = "center"; x.textBaseline = "middle";
    // same proportions as the visible guide so the mask lines up with what
    // Riley actually sees and traces.
    x.font = `800 ${GRID * 0.74}px "Baloo 2", system-ui, sans-serif`;
    x.fillText(ch, GRID / 2, GRID / 2 + GRID * 0.03);
    const data = x.getImageData(0, 0, GRID, GRID).data;
    maskCells = new Set();
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const a = data[(r * GRID + c) * 4 + 3];
        if (a > 60) maskCells.add(r + "," + c);
      }
    }
  }

  /* Faded big letter the child traces on top of. */
  function drawGuide(ch) {
    const ctx = guide.getContext("2d");
    const { w, h } = size(guide);
    ctx.clearRect(0, 0, w, h);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `800 ${h * 0.74}px "Baloo 2", system-ui, sans-serif`;
    // clearly-visible faded letter so Riley can see exactly what to trace
    ctx.fillStyle = "rgba(255,95,162,0.30)";
    ctx.fillText(ch, w / 2, h / 2 + h * 0.03);
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(230,57,138,0.55)";
    ctx.setLineDash([10, 8]);
    ctx.strokeText(ch, w / 2, h / 2 + h * 0.03);
    ctx.setLineDash([]);
  }

  function clearDrawing() {
    const ctx = draw.getContext("2d");
    const { w, h } = size(draw);
    ctx.clearRect(0, 0, w, h);
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
    const start = (e) => { e.preventDefault(); drawing = true; lastPt = null;
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

  /* Called when child taps "Done". Returns a score object.
   * coverage : a mask cell counts as traced if a finger point passed within 2
   *            cells of it — so drawing the letter's centerline is enough (a
   *            toddler won't fill the whole thick glyph).
   * offRatio : fraction of finger points that were nowhere near the letter,
   *            used to catch pure scribbling. */
  function check() {
    let covered = 0;
    for (const cell of maskCells) {
      const [r, c] = cell.split(",").map(Number);
      if (near(drawn, r, c, 2)) covered++;
    }
    const coverage = maskCells.size ? covered / maskCells.size : 0;

    let off = 0;
    for (const cell of drawn) {
      const [r, c] = cell.split(",").map(Number);
      if (!near(maskCells, r, c, 1)) off++;
    }
    const offRatio = drawn.size ? off / drawn.size : 1;

    const pass = coverage >= PASS_COVERAGE && offRatio <= MAX_OFF;
    const stars = !pass ? 0 : coverage > 0.85 ? 3 : coverage > 0.7 ? 2 : 1;
    return { pass, stars, coverage: Math.round(coverage * 100) };
  }

  function reset() { setChar(char, onComplete); }

  return { init, setChar, check, reset };
})();
