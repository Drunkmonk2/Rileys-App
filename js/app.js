/* ============================================================================
 * app.js — the brain of Riley's App
 * Navigation, the letter/number/spelling lessons, rewards, and saving progress.
 * ==========================================================================*/

const App = (() => {
  /* ---- saved progress (stars + stickers + letters learned) -------------- */
  const KEY = "rileys-app-v1";
  let state = load();
  function load() {
    const base = { stars: 0, stickers: {}, learned: [], progress: {} };
    try { return Object.assign(base, JSON.parse(localStorage.getItem(KEY)) || {}); }
    catch { return base; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }

  /* ---- per-item mastery tracking (powers the parent dashboard) ----------
   * category: "letters" | "numbers" | "words" | "games"
   * We keep correct/attempts/last so a grown-up can see exactly what Riley
   * has practiced and mastered. "Mastered" = 3+ correct. */
  function recordMastery(cat, key, success) {
    const c = state.progress[cat] = state.progress[cat] || {};
    const e = c[key] = c[key] || { correct: 0, attempts: 0, last: 0 };
    e.attempts++; if (success) e.correct++; e.last = Date.now();
    save();
  }
  function masteryLevel(cat, key) {
    const e = state.progress[cat] && state.progress[cat][key];
    if (!e || !e.correct) return 0;          // not started
    return e.correct >= 3 ? 2 : 1;            // 1 = practicing, 2 = mastered
  }

  /* ---- tiny DOM helpers ------------------------------------------------- */
  const $ = (s) => document.querySelector(s);
  const screens = {};
  function goScreen(id) {
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[id].classList.add("active");
    // The mascot + kid speech bubble don't belong on the grown-up screens.
    const grownup = id === "gate" || id === "parent";
    const fla = document.querySelector(".flamingo"), bub = $("#bubble");
    if (fla) fla.style.display = grownup ? "none" : "";
    if (bub) bub.style.display = grownup ? "none" : "";
    window.scrollTo(0, 0);
  }
  function goHome() { renderHome(); goScreen("home"); }

  /* ---- Flamingo talks --------------------------------------------------- */
  function flamingo(text, opts) {
    const bubble = $("#bubble");
    if (bubble) bubble.textContent = text;
    Speech.say(text, opts);
  }

  /* ---- stars + sticker rewards ----------------------------------------- */
  function updateStars() { $("#stars").textContent = "⭐ " + state.stars; }
  function reward(stars = 1) {
    state.stars += stars;
    // every 5 stars earns a random themed sticker
    if (state.stars % 5 === 0) earnSticker();
    updateStars(); save();
  }
  function earnSticker() {
    const s = STICKERS[Math.floor(Math.random() * STICKERS.length)];
    state.stickers[s.id] = (state.stickers[s.id] || 0) + 1;
    burst(s.emoji);
    setTimeout(() => flamingo(`You earned a ${s.label}! ${s.emoji}`), 300);
  }
  function burst(emoji) {
    const b = document.createElement("div");
    b.className = "burst";
    b.innerHTML = `<div class="big-emoji">${emoji}</div>`;
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 1300);
  }
  /* A "win" in a mini-game: celebrate, reward, and tee up the next round.
   * cat/key let games log activity for the parent dashboard. */
  function win(message, nextRound, cat, key) {
    burst("⭐");
    flamingo(message);
    reward(1);
    if (cat) recordMastery(cat, key || cat, true);
    setTimeout(() => nextRound && nextRound(), 1600);
  }

  /* ===================================================================== *
   * HOME
   * ===================================================================== */
  function renderHome() {
    flamingo(`Hi Riley! I'm Flamingo Flamingo! What do you want to play?`);
  }

  /* ===================================================================== *
   * LETTERS lesson
   * ===================================================================== */
  let lIdx = 0;
  function startLetters() { lIdx = 0; renderLetter(); goScreen("letter"); }
  function renderLetter() {
    const L = LETTERS[lIdx];
    $("#letter-char").textContent = L.letter;
    $("#letter-example").innerHTML =
      `<span class="emoji">${L.emoji}</span> ${L.letter} is for ${L.word}`;
    flamingo(`This is ${L.letter}. ${L.letter} says ${L.sound}. ${L.letter} is for ${L.word}.`);
  }
  function hearLetter() {
    const L = LETTERS[lIdx];
    Speech.say(`${L.letter}.`).then(() => Speech.saySound(L.sound))
      .then(() => Speech.say(`${L.word}.`));
  }
  function nextLetter() { lIdx = (lIdx + 1) % LETTERS.length; renderLetter(); }
  function prevLetter() { lIdx = (lIdx - 1 + LETTERS.length) % LETTERS.length; renderLetter(); }

  /* ---- say-it-back (microphone) for the current letter ----------------- */
  async function sayLetter() {
    const L = LETTERS[lIdx];
    const ok = await listenFor([L.letter.toLowerCase(), L.sound, L.word.toLowerCase()],
      `Say the letter ${L.letter}!`,
      `Yes! ${L.letter}! Great job Riley!`,
      `Let's try again. ${L.letter} says ${L.sound}.`,
      "#letter-heard");
    if (ok !== null) recordMastery("letters", L.letter, ok);
  }

  /* ---- trace-it for the current letter --------------------------------- */
  function traceLetter() {
    openTrace(LETTERS[lIdx].letter, () => { renderLetter(); goScreen("letter"); },
      "letters", LETTERS[lIdx].letter);
  }

  /* ===================================================================== *
   * NUMBERS lesson
   * ===================================================================== */
  let nIdx = 0;
  function startNumbers() { nIdx = 0; renderNumber(); goScreen("number"); }
  function renderNumber() {
    const N = NUMBERS[nIdx];
    $("#number-char").textContent = N.value;
    $("#number-example").textContent = N.word;
    flamingo(`This is ${N.value}. ${N.word}.`);
  }
  function hearNumber() { const N = NUMBERS[nIdx]; Speech.say(`${N.value}. ${N.word}.`); }
  function nextNumber() { nIdx = (nIdx + 1) % NUMBERS.length; renderNumber(); }
  function prevNumber() { nIdx = (nIdx - 1 + NUMBERS.length) % NUMBERS.length; renderNumber(); }
  async function sayNumber() {
    const N = NUMBERS[nIdx];
    const ok = await listenFor([String(N.value), N.word],
      `Say the number ${N.value}!`,
      `Yes! ${N.value}! Awesome Riley!`,
      `Almost! This is ${N.value}, say ${N.word}.`,
      "#number-heard");
    if (ok !== null) recordMastery("numbers", String(N.value), ok);
  }
  function traceNumber() {
    openTrace(String(NUMBERS[nIdx].value), () => { renderNumber(); goScreen("number"); },
      "numbers", String(NUMBERS[nIdx].value));
  }

  /* ===================================================================== *
   * SPELLING — sound it out and build the word
   * ===================================================================== */
  let sIdx = 0, builtLen = 0;
  function startSpelling() { sIdx = 0; renderSpelling(); goScreen("spell"); }
  function renderSpelling() {
    const W = SPELLING_WORDS[sIdx];
    builtLen = 0;
    $("#spell-emoji").textContent = W.emoji;
    $("#spell-slots").innerHTML = W.word.split("").map((_, i) =>
      `<span class="choice" id="slot-${i}" style="min-height:64px;width:64px;display:inline-flex;align-items:center;justify-content:center">_</span>`
    ).join(" ");
    // letter tiles, shuffled
    const tiles = W.word.split("").map((c, i) => ({ c, i }))
      .sort(() => Math.random() - 0.5);
    $("#spell-tiles").innerHTML = tiles.map(t =>
      `<button class="choice" data-c="${t.c}" style="width:64px">${t.c.toUpperCase()}</button>`
    ).join(" ");
    $("#spell-tiles").querySelectorAll("button").forEach(b => b.onclick = () => tapTile(b));
    flamingo(`Let's spell ${W.word}. Listen to the sounds and put them in order.`);
    soundOut(W);
  }
  function soundOut(W) {
    // say each sound slowly, then blend the whole word
    (async () => {
      for (const s of W.sounds) { await Speech.saySound(s); }
      await Speech.say(W.word + "!");
    })();
  }
  function tapTile(btn) {
    const W = SPELLING_WORDS[sIdx];
    const need = W.word[builtLen];
    if (btn.dataset.c === need && !btn.disabled) {
      $("#slot-" + builtLen).textContent = need.toUpperCase();
      btn.disabled = true; btn.style.opacity = .3;
      Speech.saySound(W.sounds[builtLen]);
      builtLen++;
      if (builtLen === W.word.length) {
        burst("🎉"); reward(2);
        recordMastery("words", W.word, true);
        flamingo(`You spelled ${W.word}! Amazing Riley!`);
      }
    } else {
      flamingo(`Next we need the ${W.sounds[builtLen]} sound. Find that letter!`);
    }
  }
  function nextSpelling() { sIdx = (sIdx + 1) % SPELLING_WORDS.length; renderSpelling(); }
  async function saySpelling() {
    const W = SPELLING_WORDS[sIdx];
    const ok = await listenFor([W.word], `Now you say it: ${W.word}!`,
      `Perfect! ${W.word}!`, `Try again: ${W.word}.`, "#spell-heard");
    if (ok !== null) recordMastery("words", W.word, ok);
  }

  /* ===================================================================== *
   * Shared: listen for one of several acceptable answers
   * ===================================================================== */
  // Returns true (correct), false (heard but wrong/nothing), or null (no mic,
  // so the caller should NOT record a mastery attempt).
  async function listenFor(accept, prompt, good, retry, heardSel) {
    const heard = $(heardSel);
    if (!Speech.supported) {
      if (heard) heard.textContent = "(Tip: open in Safari for the microphone)";
      flamingo(prompt);
      return null;
    }
    await flamingo(prompt);
    const { text } = await Speech.listen({
      onStart: () => { if (heard) heard.textContent = "🎤 Listening..."; }
    });
    if (heard) heard.textContent = text ? `I heard: "${text}"` : "I didn't hear you!";
    const ok = accept.some(a => text.includes(a));
    if (ok) { burst("⭐"); reward(1); flamingo(good); }
    else { flamingo(retry); }
    return ok;
  }

  /* ===================================================================== *
   * Tracing screen (shared by letters & numbers)
   * ===================================================================== */
  let traceReturn = null, traceInited = false, traceCat = "", traceKey = "";
  function openTrace(ch, onBack, cat, key) {
    traceReturn = onBack; traceCat = cat; traceKey = key;
    goScreen("trace");
    if (!traceInited) {
      Tracing.init($("#trace-guide"), $("#trace-draw"));
      traceInited = true;
    }
    $("#trace-result").textContent = "";
    Tracing.setChar(ch);
    flamingo(`Trace the ${isNaN(+ch) ? "letter" : "number"} ${ch} with your finger!`);
  }
  function checkTrace() {
    const r = Tracing.check();
    if (traceCat) recordMastery(traceCat, traceKey, r.pass);
    if (r.pass) {
      burst("⭐"); reward(r.stars);
      $("#trace-result").textContent = "⭐".repeat(r.stars) + "  Beautiful!";
      flamingo(`Wonderful tracing, Riley! ${r.stars} stars!`);
    } else {
      $("#trace-result").textContent = "Let's try once more!";
      flamingo(`Good try! Let's trace it again, slow and steady.`);
      Tracing.reset();
    }
  }

  /* ===================================================================== *
   * STICKER BOOK
   * ===================================================================== */
  function renderStickers() {
    $("#sticker-grid").innerHTML = STICKERS.map(s => {
      const cnt = state.stickers[s.id] || 0;
      return `<div class="sticker ${cnt ? "" : "locked"}">${s.emoji}
        <span class="cnt">${cnt ? "x" + cnt : "?"}</span></div>`;
    }).join("");
    goScreen("stickers");
    flamingo(`Look at all your stickers, Riley! You have ${state.stars} stars!`);
  }

  /* ===================================================================== *
   * PARENT DASHBOARD  (gated so a 3-year-old can't wander in)
   * ===================================================================== */
  let gateAnswer = 0, gateEntry = "";
  function openGate() {
    const a = 3 + Math.floor(Math.random() * 6), b = 2 + Math.floor(Math.random() * 6);
    gateAnswer = a * b; gateEntry = "";
    $("#gate-q").textContent = `${a} × ${b} = ?`;
    $("#gate-entry").textContent = "";
    $("#gate-msg").textContent = "";
    $("#gate-pad").innerHTML =
      [1,2,3,4,5,6,7,8,9,0].map(d => `<button class="choice" data-d="${d}" style="min-height:56px">${d}</button>`).join("") +
      `<button class="choice" data-act="del" style="min-height:56px">⌫</button>` +
      `<button class="choice" data-act="ok" style="min-height:56px;background:var(--green);color:#fff">OK</button>`;
    $("#gate-pad").querySelectorAll("button").forEach(b2 => b2.onclick = () => {
      if (b2.dataset.act === "del") gateEntry = gateEntry.slice(0, -1);
      else if (b2.dataset.act === "ok") {
        if (+gateEntry === gateAnswer) renderParent();
        else { $("#gate-msg").textContent = "Try again"; gateEntry = ""; }
      } else if (gateEntry.length < 3) gateEntry += b2.dataset.d;
      $("#gate-entry").textContent = gateEntry;
    });
    goScreen("gate");
    // No flamingo voice here — this screen is for grown-ups.
    if (window.speechSynthesis) speechSynthesis.cancel();
  }

  function tile(level) {           // color a progress cell by mastery level
    return level === 2 ? "background:var(--green);color:#fff"
         : level === 1 ? "background:var(--sun);color:#34233f"
         : "background:#eee;color:#aaa";
  }
  function countMastered(cat, keys) {
    return keys.filter(k => masteryLevel(cat, k) === 2).length;
  }
  function lastActive() {
    let t = 0;
    for (const cat of Object.values(state.progress))
      for (const e of Object.values(cat)) if (e.last > t) t = e.last;
    return t ? new Date(t).toLocaleDateString() : "—";
  }
  function renderParent() {
    const letterKeys = LETTERS.map(l => l.letter);
    const numberKeys = NUMBERS.map(n => String(n.value));
    const lm = countMastered("letters", letterKeys);
    const nm = countMastered("numbers", numberKeys);
    const wm = countMastered("words", SPELLING_WORDS.map(w => w.word));
    const cell = (label, lvl) =>
      `<span class="choice" style="min-height:40px;width:40px;font-size:1rem;${tile(lvl)}">${label}</span>`;

    $("#parent-body").innerHTML = `
      <div class="dash-stats">
        <div class="stat"><b>⭐ ${state.stars}</b><span>stars</span></div>
        <div class="stat"><b>🏆 ${Object.values(state.stickers).reduce((a,b)=>a+b,0)}</b><span>stickers</span></div>
        <div class="stat"><b>${lm}/26</b><span>letters</span></div>
        <div class="stat"><b>${nm}/21</b><span>numbers</span></div>
        <div class="stat"><b>${wm}/${SPELLING_WORDS.length}</b><span>words</span></div>
        <div class="stat"><b>${lastActive()}</b><span>last played</span></div>
      </div>
      <p class="dash-legend">
        <span style="${tile(2)};padding:2px 8px;border-radius:8px">mastered</span>
        <span style="${tile(1)};padding:2px 8px;border-radius:8px">practicing</span>
        <span style="${tile(0)};padding:2px 8px;border-radius:8px">not yet</span>
      </p>
      <h3>Letters &amp; Sounds</h3>
      <div class="dash-grid">${letterKeys.map(k => cell(k, masteryLevel("letters", k))).join("")}</div>
      <h3>Numbers</h3>
      <div class="dash-grid">${numberKeys.map(k => cell(k, masteryLevel("numbers", k))).join("")}</div>
      <h3>Spelling Words</h3>
      <div class="dash-grid">${SPELLING_WORDS.map(w =>
        cell(w.word, masteryLevel("words", w.word))).join("")}</div>
      <h3>Tip</h3>
      <p class="dash-tip">Aim for short, daily 5–10 min sessions. Mastery here means
        Riley got an item right 3+ times. Green letters are solid — spend time on
        the grey and yellow ones next.</p>
    `;
    goScreen("parent");
  }
  function resetProgress() {
    if (!confirm("Reset ALL of Riley's stars, stickers and progress?")) return;
    state = { stars: 0, stickers: {}, learned: [], progress: {} };
    save(); updateStars(); renderParent();
  }

  /* ===================================================================== *
   * WIRE UP
   * ===================================================================== */
  function init() {
    document.querySelectorAll(".screen").forEach(s => screens[s.id] = s);
    updateStars();

    // home tiles
    bind("#tile-letters", startLetters);
    bind("#tile-numbers", startNumbers);
    bind("#tile-spelling", startSpelling);
    bind("#tile-games", () => { goScreen("games"); flamingo("Pick a game, Riley!"); });
    bind("#tile-stickers", renderStickers);
    bind("#tile-sounds", () => { goScreen("game"); Games.firstSound(); });

    // letter screen
    bind("#letter-hear", hearLetter);
    bind("#letter-say", sayLetter);
    bind("#letter-trace", traceLetter);
    bind("#letter-next", nextLetter);
    bind("#letter-prev", prevLetter);

    // number screen
    bind("#number-hear", hearNumber);
    bind("#number-say", sayNumber);
    bind("#number-trace", traceNumber);
    bind("#number-next", nextNumber);
    bind("#number-prev", prevNumber);

    // spelling screen
    bind("#spell-hear", () => soundOut(SPELLING_WORDS[sIdx]));
    bind("#spell-say", saySpelling);
    bind("#spell-next", nextSpelling);

    // trace screen
    bind("#trace-check", checkTrace);
    bind("#trace-clear", () => Tracing.reset());
    bind("#trace-back", () => traceReturn && traceReturn());

    // games menu
    bind("#g-colors", () => { goScreen("game"); Games.colors(); });
    bind("#g-letters", () => { goScreen("game"); Games.findLetter(); });
    bind("#g-count", () => { goScreen("game"); Games.counting(); });
    bind("#g-sounds", () => { goScreen("game"); Games.firstSound(); });

    // parent dashboard
    bind("#grownups", openGate);
    bind("#gate-cancel", goHome);
    bind("#parent-reset", resetProgress);

    // every "home" back button
    document.querySelectorAll(".to-home").forEach(b => b.onclick = goHome);
    document.querySelectorAll(".to-games").forEach(b => b.onclick = () => goScreen("games"));

    renderHome();
  }
  function bind(sel, fn) { const el = $(sel); if (el) el.onclick = fn; }

  return { init, flamingo, reward, win, goScreen, goHome, burst };
})();

window.addEventListener("DOMContentLoaded", App.init);
// A first tap unlocks audio on iOS (Safari blocks speech until user interacts).
window.addEventListener("touchstart", function unlock() {
  if (window.speechSynthesis) { try { speechSynthesis.resume(); } catch {} }
  window.removeEventListener("touchstart", unlock);
}, { once: true });
