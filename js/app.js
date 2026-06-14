/* ============================================================================
 * app.js — the brain of Riley's App
 * Navigation, the letter/number/spelling lessons, rewards, and saving progress.
 * ==========================================================================*/

const App = (() => {
  /* ---- saved progress (stars + stickers + letters learned) -------------- */
  const KEY = "rileys-app-v1";
  let state = load();
  function load() {
    const base = { stars: 0, stickers: {}, learned: [], progress: {},
                   settings: { voiceURI: null, rate: 0.8, lessonLength: "medium" } };
    try {
      const s = Object.assign(base, JSON.parse(localStorage.getItem(KEY)) || {});
      s.settings = Object.assign({ voiceURI: null, rate: 0.8, lessonLength: "medium" }, s.settings || {});
      return s;
    } catch { return base; }
  }
  function applyVoiceSettings() {
    Speech.setRate(state.settings.rate);
    if (state.settings.voiceURI) Speech.setVoice(state.settings.voiceURI);
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

  /* ---- Flamingo talks (returns a promise that resolves when audio ends) -- */
  function flamingo(text, opts) {
    const bubble = $("#bubble");
    if (bubble) bubble.textContent = text;
    return Speech.say(text, opts);
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function playSfx(name) {
    try { const a = new Audio(`audio/sfx/${name}.mp3`); a.volume = 0.5; a.play().catch(() => {}); }
    catch {}
  }

  /* ---- stars + sticker rewards ----------------------------------------- */
  function updateStars() { $("#stars").textContent = "⭐ " + state.stars; }
  // Adds stars and returns a newly-earned sticker (or null). Does NOT speak —
  // callers sequence the praise + celebration so nothing gets cut off.
  function reward(stars = 1) {
    const before = Math.floor(state.stars / 5);
    state.stars += stars;
    cheer();
    const earned = Math.floor(state.stars / 5) > before ? grantSticker() : null;
    updateStars(); save();
    return earned;
  }
  function grantSticker() {
    const s = STICKERS[Math.floor(Math.random() * STICKERS.length)];
    state.stickers[s.id] = (state.stickers[s.id] || 0) + 1;
    return s;
  }
  function cheer() {
    const f = document.querySelector(".flamingo");
    if (!f) return;
    f.classList.remove("cheer"); void f.offsetWidth; f.classList.add("cheer");
  }
  function burst(emoji) {
    const b = document.createElement("div");
    b.className = "burst";
    b.innerHTML = `<div class="big-emoji">${emoji}</div>`;
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 1300);
  }
  /* Full-screen sticker celebration with a chime; resolves when dismissed. */
  function celebrateSticker(s) {
    return new Promise((resolve) => {
      playSfx("sticker");
      const o = document.createElement("div");
      o.className = "celebrate";
      o.innerHTML = `<div class="cele-card"><div class="cele-emoji">${s.emoji}</div>
        <div class="cele-text">New sticker!<br>${s.label}</div>
        <div class="cele-tap">tap to keep going</div></div>`;
      document.body.appendChild(o);
      flamingo(`Yay! You earned a ${s.label}!`);
      let done = false;
      const finish = () => { if (done) return; done = true; o.remove(); resolve(); };
      o.onclick = finish;
      setTimeout(finish, 3200);
    });
  }
  /* A correct answer: celebrate, reward, finish the praise, THEN continue. */
  async function win(message, nextRound, cat, key) {
    burst("⭐");
    if (cat) recordMastery(cat, key || cat, true);
    const earned = reward(1);
    playSfx("correct");
    await flamingo(message);             // let the praise finish (no more cut-off)
    if (earned) await celebrateSticker(earned);
    await wait(250);
    if (nextRound) nextRound();
  }

  /* ===================================================================== *
   * HOME
   * ===================================================================== */
  function renderHome() {
    flamingo(`Welcome Riley! What would you like to work on today?`);
  }
  // iOS blocks audio until the first tap, so the greeting can't speak on load.
  // We replay it on that first interaction (if Riley is still on the home screen).
  function firstInteraction() {
    if (window.speechSynthesis) { try { speechSynthesis.resume(); } catch {} }
    if (screens.home && screens.home.classList.contains("active")) renderHome();
  }

  /* ===================================================================== *
   * LETTERS lesson
   * ===================================================================== */
  // Taught in science-of-reading order (s, a, t, p, i, n, ...), NOT A–Z, so
  // Riley can build real words almost immediately.
  const LETTER_BY_CHAR = Object.fromEntries(LETTERS.map(l => [l.letter, l]));
  const LETTERS_ORDERED = TEACHING_SEQUENCE.flat().map(c => LETTER_BY_CHAR[c]);

  let lIdx = 0;
  function startLetters() { lIdx = 0; renderLetter(); goScreen("letter"); }
  function renderLetter() {
    const L = LETTERS_ORDERED[lIdx];
    $("#letter-char").textContent = L.letter;
    $("#letter-example").innerHTML =
      `<span class="emoji">${L.emoji}</span> ${L.letter} is for ${L.word}`;
    $("#letter-progress").innerHTML =
      progressCaption("letters", L.letter, lIdx, LETTERS_ORDERED.length, "Letter");
    $("#letter-heard").textContent = "";
    flamingo(`This is ${L.letter}. ${L.letter} says ${L.sound}. ${L.letter} is for ${L.word}.`);
  }
  function hearLetter() {
    const L = LETTERS_ORDERED[lIdx];
    Speech.say(`${L.letter}.`).then(() => Speech.saySound(L.sound))
      .then(() => Speech.say(`${L.word}.`));
  }
  function nextLetter() { lIdx = (lIdx + 1) % LETTERS_ORDERED.length; renderLetter(); }
  function prevLetter() { lIdx = (lIdx - 1 + LETTERS_ORDERED.length) % LETTERS_ORDERED.length; renderLetter(); }

  /* ---- say-it-back (microphone) for the current letter ----------------- */
  async function sayLetter() {
    const L = LETTERS_ORDERED[lIdx];
    const ok = await listenFor([L.letter.toLowerCase(), L.sound, L.word.toLowerCase()],
      `Say the letter ${L.letter}!`,
      `Yes! ${L.letter}! Great job Riley!`,
      `Let's try again. ${L.letter} says ${L.sound}.`,
      "#letter-heard");
    if (ok !== null) recordMastery("letters", L.letter, ok);
  }

  /* ---- trace-it for the current letter --------------------------------- */
  function traceLetter() {
    const L = LETTERS_ORDERED[lIdx];
    openTrace(L.letter, () => { renderLetter(); goScreen("letter"); }, "letters", L.letter);
  }

  /* A small progress line shown under each lesson item. */
  function progressCaption(cat, key, idx, total, word) {
    const lvl = masteryLevel(cat, key);
    const badge = lvl === 2 ? "⭐ Mastered!" : lvl === 1 ? "👍 Practicing" : "";
    if (total <= 0) return badge;        // numbers: numeral is its own position
    const pos = `<span style="opacity:.55">${word} ${idx + 1} of ${total}</span>`;
    return badge ? `${badge}  ${pos}` : pos;
  }

  /* ===================================================================== *
   * NUMBERS lesson
   * ===================================================================== */
  let nIdx = 1;                       // start at 1, not the abstract 0
  function startNumbers() { nIdx = 1; renderNumber(); goScreen("number"); }
  function renderNumber() {
    const N = NUMBERS[nIdx];
    $("#number-char").textContent = N.value;
    $("#number-example").textContent = N.word;
    // Show that many objects so the numeral connects to a real quantity.
    $("#number-objects").textContent = N.value > 0 ? "🦩".repeat(Math.min(N.value, 20)) : "";
    $("#number-progress").innerHTML =
      progressCaption("numbers", String(N.value), 0, 0, "Number");
    $("#number-heard").textContent = "";
    flamingo(`This is ${N.value}. ${N.word}.`);
  }
  function hearNumber() { const N = NUMBERS[nIdx]; Speech.say(`${N.value}. ${N.word}.`); }
  // Point to each object and count it out loud, then say the total.
  async function countAloud() {
    const N = NUMBERS[nIdx];
    if (N.value < 1) { flamingo("Zero means none!"); return; }
    const total = Math.min(N.value, 20);
    const box = $("#number-objects");
    box.innerHTML = Array.from({ length: total },
      (_, i) => `<span id="cobj-${i}">🦩</span>`).join("");
    await flamingo("Let's count!");
    for (let i = 0; i < total; i++) {
      const s = $("#cobj-" + i);
      if (s) { s.classList.add("counting"); }
      await Speech.say(NUMBERS[i + 1].word);   // "one", "two", ...
      if (s) s.classList.remove("counting");
    }
    await Speech.say(`${N.value}!`);
  }
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
  async function tapTile(btn) {
    const W = SPELLING_WORDS[sIdx];
    const need = W.word[builtLen];
    if (btn.dataset.c === need && !btn.disabled) {
      $("#slot-" + builtLen).textContent = need.toUpperCase();
      btn.disabled = true; btn.style.opacity = .3;
      await Speech.saySound(W.sounds[builtLen]);
      builtLen++;
      if (builtLen === W.word.length) {
        burst("🎉"); recordMastery("words", W.word, true);
        const earned = reward(2); playSfx("correct");
        await flamingo(`You spelled ${W.word}! Amazing Riley!`);
        if (earned) await celebrateSticker(earned);
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
    if (ok) {
      burst("⭐"); const earned = reward(1); playSfx("correct");
      await flamingo(good);
      if (earned) await celebrateSticker(earned);
    } else { await flamingo(retry); }
    return ok;
  }

  /* ===================================================================== *
   * Tracing screen (shared by letters & numbers)
   * ===================================================================== */
  let traceReturn = null, traceInited = false, traceCat = "", traceKey = "", traceChar = "", traceAuto = false;
  function openTrace(ch, onBack, cat, key, auto) {
    traceReturn = onBack; traceCat = cat; traceKey = key; traceChar = ch; traceAuto = !!auto;
    goScreen("trace");
    if (!traceInited) {
      Tracing.init($("#trace-guide"), $("#trace-draw"));
      traceInited = true;
    }
    $("#trace-result").textContent = "";
    Tracing.setChar(ch);
    // Say the instruction, then demonstrate the strokes with the green dot.
    flamingo(`Start at the green dot and follow the arrows to write ${ch}.`)
      .then(() => Tracing.demo(ch));
  }
  async function checkTrace() {
    const r = Tracing.check();
    if (traceCat) recordMastery(traceCat, traceKey, r.pass);
    if (r.pass) {
      burst("⭐"); const earned = reward(r.stars); playSfx("correct");
      $("#trace-result").textContent = "⭐".repeat(r.stars) + "  Beautiful!";
      await flamingo(`Wonderful tracing, Riley! ${r.stars} stars!`);
      if (earned) await celebrateSticker(earned);
      if (traceAuto && traceReturn) { await wait(300); traceReturn(); }
    } else {
      $("#trace-result").textContent = "Let's try once more!";
      await flamingo(`Good try! Let's trace it again, slow and steady.`);
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
      <h3>⭐ Lesson Length</h3>
      <div class="seg" id="lesson-length">
        ${["short", "medium", "long"].map(v =>
          `<button data-len="${v}" class="${state.settings.lessonLength === v ? "on" : ""}">${v}</button>`).join("")}
      </div>
      <h3>🦩 Backup Voice</h3>
      <div class="voice-box">
        <p class="dash-tip">Flamingo speaks with built-in <b>recorded human
          clips</b> for her lessons — no setup needed. These settings only
          control the <b>backup</b> voice used for the occasional line that
          doesn't have a clip yet.</p>
        <label>Backup voice
          <select id="voice-select"></select>
        </label>
        <label>Backup talking speed: <span id="rate-label"></span>
          <input type="range" id="voice-rate" min="0.5" max="1.05" step="0.05">
        </label>
        <button class="btn" id="voice-test">🔊 Test backup voice</button>
      </div>

      <h3>Tip</h3>
      <p class="dash-tip">Aim for short, daily 5–10 min sessions. Mastery here means
        Riley got an item right 3+ times. Green letters are solid — spend time on
        the grey and yellow ones next.</p>
    `;
    bindVoiceControls();
    goScreen("parent");
  }

  function bindVoiceControls() {
    const sel = $("#voice-select"), rate = $("#voice-rate"), lbl = $("#rate-label");
    if (sel) {
      const voices = Speech.getEnglishVoices();
      const current = state.settings.voiceURI || Speech.currentVoiceURI();
      sel.innerHTML = voices.length
        ? voices.map(v => `<option value="${v.uri}" ${v.uri === current ? "selected" : ""}>${v.name} (${v.lang})</option>`).join("")
        : `<option>No voices found yet — tap “Test”, then reopen this screen</option>`;
      sel.onchange = () => {
        state.settings.voiceURI = sel.value; Speech.setVoice(sel.value); save();
        Speech.say("Hi Riley! I'm Flamingo Flamingo.", { device: true });
      };
    }
    if (rate) {
      rate.value = state.settings.rate;
      if (lbl) lbl.textContent = rate.value;
      rate.oninput = () => { if (lbl) lbl.textContent = rate.value; };
      rate.onchange = () => {
        state.settings.rate = parseFloat(rate.value);
        Speech.setRate(state.settings.rate); save();
        Speech.say("This is how fast I will talk now.", { device: true });
      };
    }
    const test = $("#voice-test");
    if (test) test.onclick = () =>
      Speech.say("Hi Riley! I am Flamingo Flamingo. Let's learn together!", { device: true });
    const seg = $("#lesson-length");
    if (seg) seg.querySelectorAll("button").forEach(b => b.onclick = () => {
      state.settings.lessonLength = b.dataset.len; save();
      seg.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
    });
  }
  function resetProgress() {
    if (!confirm("Reset ALL of Riley's stars, stickers and progress?\n(Her voice settings are kept.)")) return;
    state = { stars: 0, stickers: {}, learned: [], progress: {}, settings: state.settings };
    save(); updateStars();
    flamingo("");                       // clear any lingering bubble
    renderParent();
  }

  /* ===================================================================== *
   * READ WORDS — blend the sounds and read the whole word (the payoff!)
   * ===================================================================== */
  const READ_WORDS = SPELLING_WORDS;    // simple decodable CVC words
  let rIdx = 0, readWord = null, readDone = null;
  function startReading() { rIdx = 0; readDone = null; renderRead(READ_WORDS[rIdx]); }
  function renderRead(W, onDone) {
    readWord = W; readDone = onDone || null;
    $("#read-emoji").textContent = W.emoji;
    $("#read-word").innerHTML = W.word.split("")
      .map((c, i) => `<span id="read-l-${i}">${c.toUpperCase()}</span>`).join("");
    $("#read-heard").textContent = "";
    // In a guided lesson the button reads "Keep going"; on its own it cycles words.
    $("#read-next").innerHTML = readDone ? "Keep going ➡️" : "Next word ➡️";
    goScreen("read");
    flamingo("Can you read this word? Sound it out, then say it.");
  }
  function hiRead(i) {
    readWord.word.split("").forEach((_, k) => {
      const el = $("#read-l-" + k); if (el) el.classList.toggle("hi", k === i);
    });
  }
  async function readSound() {
    const W = readWord;
    for (let i = 0; i < W.sounds.length; i++) { hiRead(i); await Speech.saySound(W.sounds[i]); }
    hiRead(-1); await Speech.say(`${W.word}!`);
  }
  async function readSay() {
    const W = readWord;
    const ok = await listenFor([W.word], `Now read it: ${W.word}!`,
      `Yes! You read ${W.word}! Great reading!`,
      `Sound it out again, then say ${W.word}.`, "#read-heard");
    if (ok !== null) recordMastery("reading", W.word, ok);
    if (ok && readDone) { const d = readDone; readDone = null; await wait(300); d(); }
  }
  function nextReadWord() {
    if (readDone) { const d = readDone; readDone = null; d(); return; }   // guided: advance lesson
    rIdx = (rIdx + 1) % READ_WORDS.length; renderRead(READ_WORDS[rIdx]);
  }

  /* ===================================================================== *
   * GUIDED LESSON — "Let's Learn!" weaves teaching + games + reading and
   * focuses on what Riley hasn't mastered yet. Games live here, not in a menu.
   * ===================================================================== */
  let gQueue = [], gIdx = 0, gTotal = 0, sessionStartStars = 0;
  function startGuided() {
    sessionStartStars = state.stars;
    gQueue = buildSession(); gIdx = 0; gTotal = gQueue.length;
    flamingo("Let's learn together, Riley! Here we go!").then(runGuided);
  }
  function runGuided() {
    if (gIdx >= gQueue.length) return finishGuided();
    gQueue[gIdx]();
  }
  function guidedNext() { gIdx++; runGuided(); }
  function finishGuided() {
    const earned = state.stars - sessionStartStars;
    goScreen("done");
    $("#done-stars").textContent = "⭐".repeat(Math.max(1, Math.min(earned, 12)));
    $("#done-msg").textContent =
      `You earned ${earned} star${earned === 1 ? "" : "s"} this lesson — ${state.stars} stars total!`;
    burst("🏆"); playSfx("sticker");
    flamingo("You did it! Great job today, Riley! I'm so proud of you!");
  }

  // Adaptive session: prioritizes the letters/words Riley hasn't mastered, and
  // its length follows the grown-up "lesson length" setting.
  function leastMastered(list, cat, keyOf) {
    return [...list].sort((a, b) => {
      const ea = state.progress[cat] && state.progress[cat][keyOf(a)];
      const eb = state.progress[cat] && state.progress[cat][keyOf(b)];
      return ((ea && ea.correct) || 0) - ((eb && eb.correct) || 0);
    });
  }
  function buildSession() {
    const len = (state.settings.lessonLength) || "medium";
    const conf = { short: { teach: 1, games: 2, read: 1 },
                   medium: { teach: 2, games: 3, read: 1 },
                   long: { teach: 3, games: 4, read: 2 } }[len];

    const teachLetters = leastMastered(LETTERS_ORDERED, "letters", l => l.letter)
      .slice(0, conf.teach);
    const readWords = leastMastered(READ_WORDS, "reading", w => w.word)
      .slice(0, conf.read);

    const gamePool = [
      () => { goScreen("game"); Games.firstSound(guidedNext); },
      () => { goScreen("game"); Games.counting(guidedNext); },
      () => { goScreen("game"); Games.findLetter(guidedNext); },
      () => { goScreen("game"); Games.colors(guidedNext); },
    ];
    const teachSteps = teachLetters.map(l => () => teachLetterStep(l.letter));
    const gameSteps = Array.from({ length: conf.games }, (_, i) => gamePool[i % gamePool.length]);
    const readSteps = readWords.map(w => () => renderRead(w, guidedNext));

    // interleave teaching with games for variety, then end with reading
    const out = []; let ti = 0, gj = 0;
    while (ti < teachSteps.length || gj < gameSteps.length) {
      if (ti < teachSteps.length) out.push(teachSteps[ti++]);
      if (gj < gameSteps.length) out.push(gameSteps[gj++]);
    }
    return out.concat(readSteps);
  }
  function teachLetterStep(ch) {
    const L = LETTER_BY_CHAR[ch];
    flamingo(`${L.letter} says ${L.sound}. ${L.letter} is for ${L.word}.`)
      .then(() => openTrace(L.letter, guidedNext, "letters", L.letter, true));
  }

  /* ===================================================================== *
   * WIRE UP
   * ===================================================================== */
  function init() {
    document.querySelectorAll(".screen").forEach(s => screens[s.id] = s);
    updateStars();
    applyVoiceSettings();

    // home tiles
    bind("#tile-learn", startGuided);
    bind("#tile-letters", startLetters);
    bind("#tile-numbers", startNumbers);
    bind("#tile-read", startReading);
    bind("#tile-spelling", startSpelling);
    bind("#tile-stickers", renderStickers);

    // letter screen
    bind("#letter-char", hearLetter);   // kids tap the big letter to hear it
    bind("#number-char", hearNumber);
    bind("#letter-hear", hearLetter);
    bind("#letter-say", sayLetter);
    bind("#letter-trace", traceLetter);
    bind("#letter-next", nextLetter);
    bind("#letter-prev", prevLetter);

    // number screen
    bind("#number-count", countAloud);
    bind("#number-say", sayNumber);
    bind("#number-trace", traceNumber);
    bind("#number-next", nextNumber);
    bind("#number-prev", prevNumber);

    // spelling screen
    bind("#spell-hear", () => soundOut(SPELLING_WORDS[sIdx]));
    bind("#spell-say", saySpelling);
    bind("#spell-next", nextSpelling);

    // trace screen
    bind("#trace-watch", () => Tracing.demo(traceChar));
    bind("#trace-check", checkTrace);
    bind("#trace-clear", () => Tracing.reset());
    bind("#trace-back", () => traceReturn && traceReturn());

    // read words
    bind("#read-sound", readSound);
    bind("#read-say", readSay);
    bind("#read-next", nextReadWord);

    // guided lesson "play again"
    bind("#done-again", startGuided);

    // parent dashboard
    bind("#grownups", openGate);
    bind("#gate-cancel", goHome);
    bind("#parent-reset", resetProgress);

    // every "home" back button
    document.querySelectorAll(".to-home").forEach(b => b.onclick = goHome);

    renderHome();
  }
  function bind(sel, fn) { const el = $(sel); if (el) el.onclick = fn; }

  return { init, flamingo, reward, win, goScreen, goHome, burst, firstInteraction };
})();

window.addEventListener("DOMContentLoaded", App.init);
// The first tap unlocks audio on iOS and triggers Flamingo's spoken welcome.
window.addEventListener("pointerdown", function unlock() {
  App.firstInteraction();
  window.removeEventListener("pointerdown", unlock);
}, { once: true });
