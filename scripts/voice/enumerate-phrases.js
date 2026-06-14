/* ============================================================================
 * enumerate-phrases.js
 * Produces scripts/voice/phrases.json — every line Flamingo can say, so we can
 * pre-generate human-voice audio clips for them. Loads the REAL js/data.js so
 * the phrase list always matches the app's curriculum.
 *
 * Each entry: { key, text }
 *   key  = normalized lookup key (must match normalizeKey() in js/speech.js)
 *   text = what to feed the TTS (emoji stripped; punctuation kept for prosody)
 * ==========================================================================*/
const fs = require("fs");
const path = require("path");

// --- load the curriculum data ---------------------------------------------
const code = fs.readFileSync(path.join(__dirname, "../../js/data.js"), "utf8");
const exportLine =
  "\n;globalThis.__DATA={LETTERS,NUMBERS,SPELLING_WORDS,COLORS,FIRST_SOUND_WORDS,STICKERS};";
eval(code + exportLine); // eslint-disable-line no-eval
const D = globalThis.__DATA;

// --- helpers (keep normalizeKey identical to js/speech.js) -----------------
const normalizeKey = (t) =>
  t.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
const stripEmoji = (t) =>
  t.replace(/[^\x00-\x7F]+/g, "").replace(/\s+/g, " ").trim();

const seen = new Map();
const add = (text) => {
  const key = normalizeKey(text);
  if (!key || seen.has(key)) return;
  seen.set(key, { key, text: stripEmoji(text) });
};

// --- Letters ---------------------------------------------------------------
for (const L of D.LETTERS) {
  add(`This is ${L.letter}. ${L.letter} says ${L.sound}. ${L.letter} is for ${L.word}.`);
  add(`${L.letter}.`);
  add(`${L.word}.`);
  add(L.sound);
  add(`Say the letter ${L.letter}!`);
  add(`Yes! ${L.letter}! Great job Riley!`);
  add(`Let's try again. ${L.letter} says ${L.sound}.`);
  add(`Trace the letter ${L.letter} with your finger!`);
}

// --- Numbers ---------------------------------------------------------------
for (const N of D.NUMBERS) {
  add(`This is ${N.value}. ${N.word}.`);
  add(`${N.value}. ${N.word}.`);
  add(`Say the number ${N.value}!`);
  add(`Yes! ${N.value}! Awesome Riley!`);
  add(`Almost! This is ${N.value}, say ${N.word}.`);
  add(`Trace the number ${N.value} with your finger!`);
}

// --- Tracing feedback ------------------------------------------------------
add(`Wonderful tracing, Riley! 1 stars!`);
add(`Wonderful tracing, Riley! 2 stars!`);
add(`Wonderful tracing, Riley! 3 stars!`);
add(`Good try! Let's trace it again, slow and steady.`);

// --- Spelling --------------------------------------------------------------
for (const W of D.SPELLING_WORDS) {
  add(`Let's spell ${W.word}. Listen to the sounds and put them in order.`);
  add(`${W.word}!`);
  add(`You spelled ${W.word}! Amazing Riley!`);
  add(`Now you say it: ${W.word}!`);
  add(`Perfect! ${W.word}!`);
  add(`Try again: ${W.word}.`);
  for (const s of W.sounds) {
    add(s);
    add(`Next we need the ${s} sound. Find that letter!`);
  }
}

// --- Stickers + home + menus ----------------------------------------------
for (const s of D.STICKERS) add(`You earned a ${s.label}! ${s.emoji}`);
// Flamingo's launch self-introduction + warm home prompts (keep in sync w/ app.js)
add(`Hey Riley! It's me, Flamingo Flamingo! I'm going to help you learn your letters and numbers today. Where should we get started?`);
add(`What would you like to do, Riley? Letters, numbers, or reading?`);
add(`Ooh, what should we learn next, Riley?`);
add(`Pick something fun and let's play, Riley!`);
add(`I'm ready when you are, Riley! What sounds fun?`);
add(`Welcome Riley! What would you like to work on today?`);
add(`Pick a game, Riley!`);

// --- Games -----------------------------------------------------------------
for (const c of D.COLORS) {
  add(`Riley, can you find the color ${c.name}?`);
  add(`Yes! That's ${c.name}! 🎉`);
}
for (const L of D.LETTERS) {
  add(`Find the letter ${L.letter}. It says ${L.sound}.`);
  add(`Great! That's ${L.letter}! ⭐`);
}
add(`How many do you see? Count them out loud!`);
for (let n = 1; n <= 12; n++) add(`That's right — ${n}! 🎉`);
add(`Let's count again together: one, two, three...`);
for (const it of D.FIRST_SOUND_WORDS) {
  add(`Listen: ${it.word}. What sound does ${it.word} start with?`);
  add(`Yes! ${it.word} starts with ${it.first} — ${it.sound}! ⭐`);
  add(`Listen again... ${it.sound}... ${it.word}.`);
}

// --- Counting aloud + number words ----------------------------------------
add(`Let's count!`);
add(`Zero means none!`);
for (const N of D.NUMBERS) {
  if (N.value >= 1) { add(N.word); add(`${N.value}!`); }
}

// --- Read Words (blending payoff) -----------------------------------------
add(`Let's read this word, Riley. Listen!`);
add(`Now you try! Sound it out, then read it.`);
for (const W of D.SPELLING_WORDS) {
  add(`Now read it: ${W.word}!`);
  add(`Yes! You read ${W.word}! Great reading, Riley!`);
  add(`Let's sound it out again, then say ${W.word}.`);
}

// --- Guided lesson + tracing demo + celebration ---------------------------
add(`Let's learn together, Riley! Here we go!`);
add(`You did it! Great job today, Riley! I'm so proud of you!`);
for (const L of D.LETTERS) {
  add(`${L.letter} says ${L.sound}. ${L.letter} is for ${L.word}.`);
  add(`Start at the green dot and follow the arrows to write ${L.letter}.`);
}
for (const N of D.NUMBERS) {
  add(`Start at the green dot and follow the arrows to write ${N.value}.`);
}
for (const s of D.STICKERS) add(`Yay! You earned a ${s.label}!`);

// --- write -----------------------------------------------------------------
const out = [...seen.values()];
fs.writeFileSync(path.join(__dirname, "phrases.json"), JSON.stringify(out, null, 2));
console.log(`Wrote ${out.length} phrases to scripts/voice/phrases.json`);
