/* ============================================================================
 * app.js — the brain of Riley's App
 * Navigation, the letter/number/spelling lessons, rewards, and saving progress.
 * ==========================================================================*/

const App = (() => {
  /* ---- saved progress (stars + stickers + letters learned) -------------- */
  const KEY = "rileys-app-v1";
  let state = load();
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) ||
      { stars: 0, stickers: {}, learned: [] }; }
    catch { return { stars: 0, stickers: {}, learned: [] }; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }

  /* ---- tiny DOM helpers ------------------------------------------------- */
  const $ = (s) => document.querySelector(s);
  const screens = {};
  function goScreen(id) {
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[id].classList.add("active");
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
  /* A "win" in a mini-game: celebrate, reward, and tee up the next round. */
  function win(message, nextRound) {
    burst("⭐");
    flamingo(message);
    reward(1);
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
    await listenFor([L.letter.toLowerCase(), L.sound, L.word.toLowerCase()],
      `Say the letter ${L.letter}!`,
      `Yes! ${L.letter}! Great job Riley!`,
      `Let's try again. ${L.letter} says ${L.sound}.`,
      "#letter-heard");
  }

  /* ---- trace-it for the current letter --------------------------------- */
  function traceLetter() {
    openTrace(LETTERS[lIdx].letter, () => { renderLetter(); goScreen("letter"); });
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
    await listenFor([String(N.value), N.word],
      `Say the number ${N.value}!`,
      `Yes! ${N.value}! Awesome Riley!`,
      `Almost! This is ${N.value}, say ${N.word}.`,
      "#number-heard");
  }
  function traceNumber() {
    openTrace(String(NUMBERS[nIdx].value), () => { renderNumber(); goScreen("number"); });
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
        flamingo(`You spelled ${W.word}! Amazing Riley!`);
      }
    } else {
      flamingo(`Next we need the ${W.sounds[builtLen]} sound. Find that letter!`);
    }
  }
  function nextSpelling() { sIdx = (sIdx + 1) % SPELLING_WORDS.length; renderSpelling(); }
  async function saySpelling() {
    const W = SPELLING_WORDS[sIdx];
    await listenFor([W.word], `Now you say it: ${W.word}!`,
      `Perfect! ${W.word}!`, `Try again: ${W.word}.`, "#spell-heard");
  }

  /* ===================================================================== *
   * Shared: listen for one of several acceptable answers
   * ===================================================================== */
  async function listenFor(accept, prompt, good, retry, heardSel) {
    const heard = $(heardSel);
    if (!Speech.supported) {
      if (heard) heard.textContent = "(Tip: open in Safari for the microphone)";
      flamingo(prompt);
      return;
    }
    await flamingo(prompt);
    const mic = document.activeElement;
    const { text } = await Speech.listen({
      onStart: () => { if (heard) heard.textContent = "🎤 Listening..."; }
    });
    if (heard) heard.textContent = text ? `I heard: "${text}"` : "I didn't hear you!";
    const ok = accept.some(a => text.includes(a));
    if (ok) { burst("⭐"); reward(1); flamingo(good); }
    else { flamingo(retry); }
  }

  /* ===================================================================== *
   * Tracing screen (shared by letters & numbers)
   * ===================================================================== */
  let traceReturn = null, traceInited = false;
  function openTrace(ch, onBack) {
    traceReturn = onBack;
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
