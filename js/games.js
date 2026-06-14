/* ============================================================================
 * games.js — gamified mini-games. Each renders into #game-area and uses
 * App helpers (App.flamingo, App.reward, App.goScreen). Short rounds, lots of
 * praise, immediate corrective feedback (the science-of-reading way).
 * ==========================================================================*/

const Games = (() => {
  const area = () => document.getElementById("game-area");
  const title = () => document.getElementById("game-title");
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (a) => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(p => p[1]);

  /* Each game takes an optional onDone() — when present (guided lessons) it
   * advances after one correct answer; otherwise the game loops itself. */

  /* ---- COLORS: "Tap the red one!" -------------------------------------- */
  function colors(onDone) {
    title().textContent = "🎨 Color Game";
    const opts = shuffle([...COLORS]).slice(0, 4);
    const target = rand(opts);
    App.flamingo(`Riley, can you find the color ${target.name}?`);
    area().innerHTML = `<div class="choices">${opts.map(c =>
      `<button class="choice swatch" style="background:${c.hex}" data-name="${c.name}"></button>`
    ).join("")}</div>`;
    area().querySelectorAll(".choice").forEach(b => b.onclick = () => {
      if (b.dataset.name === target.name) {
        b.classList.add("correct");
        App.win(`Yes! That's ${target.name}! 🎉`, onDone || colors, "games", "colors");
      } else {
        b.classList.add("wrong");
        App.flamingo(`Oops! That's ${b.dataset.name}. Try the ${target.name} one!`);
      }
    });
  }

  /* ---- FIND THE LETTER ------------------------------------------------- */
  function findLetter(onDone) {
    title().textContent = "🔤 Letter Hunt";
    const pool = shuffle([...LETTERS]).slice(0, 4);
    const target = rand(pool);
    App.flamingo(`Find the letter ${target.letter}. It says ${target.sound}.`);
    area().innerHTML = `<div class="choices">${pool.map(l =>
      `<button class="choice" data-l="${l.letter}">${l.letter}</button>`
    ).join("")}</div>`;
    area().querySelectorAll(".choice").forEach(b => b.onclick = () => {
      if (b.dataset.l === target.letter) {
        b.classList.add("correct");
        App.win(`Great! That's ${target.letter}! ⭐`, onDone || findLetter, "games", "letterHunt");
      } else {
        b.classList.add("wrong");
        App.flamingo(`That's ${b.dataset.l}. We want ${target.letter}!`);
      }
    });
  }

  /* ---- COUNTING: count the emojis, tap the number ---------------------- */
  function counting(onDone) {
    title().textContent = "🔢 Counting Game";
    const n = 1 + Math.floor(Math.random() * 9);     // 1–9, easy to count
    const icon = rand(["🦩","⚽","🧁","👑","🏀","⭐","🏈"]);
    App.flamingo(`How many do you see? Count them out loud!`);
    const opts = shuffle([n, clampDiff(n, -1), clampDiff(n, 1), clampDiff(n, 2)]
      .filter((v, i, a) => a.indexOf(v) === i)).slice(0, 4);
    if (!opts.includes(n)) opts[0] = n;
    area().innerHTML = `
      <div style="font-size:2.4rem;text-align:center;line-height:1.4;margin:10px">
        ${icon.repeat(n)}
      </div>
      <div class="choices">${shuffle(opts).map(v =>
        `<button class="choice" data-v="${v}">${v}</button>`).join("")}</div>`;
    area().querySelectorAll(".choice").forEach(b => b.onclick = () => {
      if (+b.dataset.v === n) {
        b.classList.add("correct");
        App.win(`That's right — ${n}! 🎉`, onDone || counting, "games", "counting");
      } else {
        b.classList.add("wrong");
        App.flamingo(`Let's count again together: one, two, three...`);
      }
    });
  }
  function clampDiff(n, d) { return Math.max(1, Math.min(12, n + d)); }

  /* ---- FIRST SOUND (phonemic awareness) ------------------------------- */
  function firstSound(onDone) {
    title().textContent = "👂 First Sound";
    const item = rand(FIRST_SOUND_WORDS);
    App.flamingo(`Listen: ${item.word}. What sound does ${item.word} start with?`);
    // four letter choices, one correct
    const distract = shuffle(LETTERS.filter(l => l.letter !== item.first)).slice(0, 3);
    const opts = shuffle([{ letter: item.first }, ...distract]);
    area().innerHTML = `
      <div style="font-size:4rem;text-align:center">${item.emoji}</div>
      <div class="choices">${opts.map(o =>
        `<button class="choice" data-l="${o.letter}">${o.letter}</button>`).join("")}</div>`;
    area().querySelectorAll(".choice").forEach(b => b.onclick = () => {
      if (b.dataset.l === item.first) {
        b.classList.add("correct");
        App.win(`Yes! ${item.word} starts with ${item.first} — ${item.sound}! ⭐`, onDone || firstSound, "games", "firstSound");
      } else {
        b.classList.add("wrong");
        App.flamingo(`Listen again... ${item.sound}... ${item.word}.`);
      }
    });
  }

  /* ---- JOURNEY TO THE CASTLE: princess board game --------------------- *
   * Riley the princess walks a path of stones to her castle. A correct answer
   * hops her forward one stone; a wrong one steps her back one (never past the
   * start). Reaching the castle = big celebration, then a fresh journey.
   * Questions are a fun mix (letters, counting, first sounds, colors, reading).*/
  const GOAL = 10;
  let cPos = 0, cBusy = false;
  const cmap = () => document.getElementById("castle-map");
  const cq = () => document.getElementById("castle-q");

  function renderCastleMap() {
    let html = "";
    for (let i = 0; i <= GOAL; i++) {
      const face = i === cPos ? "👑" : i === GOAL ? "🏰" : i < cPos ? "🟢" : "⚪";
      html += `<span class="stone${i === cPos ? " here" : ""}${i === GOAL ? " castle" : ""}">${face}</span>`;
    }
    cmap().innerHTML = html;
  }

  // Each maker returns { say, big?, choices:[{label, correct, cls?, style?}] }
  function qLetter() {
    const pool = shuffle([...LETTERS]).slice(0, 4), t = rand(pool);
    return { say: `Find the letter ${t.letter}. It says ${t.sound}.`,
      choices: pool.map(l => ({ label: l.letter, correct: l.letter === t.letter })) };
  }
  function qCount() {
    const n = 1 + Math.floor(Math.random() * 9);
    const icon = rand(["🦩","⚽","🧁","👑","⭐","🐱","🌸"]);
    const set = new Set([n, clampDiff(n, -1), clampDiff(n, 1), clampDiff(n, 2)]);
    const opts = shuffle([...set]).slice(0, 4); if (!opts.includes(n)) opts[0] = n;
    return { say: `How many do you see? Count them out loud!`,
      big: `<div style="font-size:2.2rem;line-height:1.3">${icon.repeat(n)}</div>`,
      choices: shuffle(opts).map(v => ({ label: v, correct: v === n })) };
  }
  function qFirstSound() {
    const item = rand(FIRST_SOUND_WORDS);
    const distract = shuffle(LETTERS.filter(l => l.letter !== item.first)).slice(0, 3);
    const opts = shuffle([{ letter: item.first }, ...distract]);
    return { say: `Listen: ${item.word}. What sound does ${item.word} start with?`,
      big: `<div style="font-size:3.6rem">${item.emoji}</div>`,
      choices: opts.map(o => ({ label: o.letter, correct: o.letter === item.first })) };
  }
  function qColor() {
    const opts = shuffle([...COLORS]).slice(0, 4), t = rand(opts);
    return { say: `Riley, can you find the color ${t.name}?`,
      choices: opts.map(c => ({ label: "", correct: c.name === t.name, cls: "swatch", style: `background:${c.hex}` })) };
  }
  function qRead() {
    const pool = shuffle([...SPELLING_WORDS]).slice(0, 4), t = rand(pool);
    return { say: `Which word is this?`,
      big: `<div style="font-size:3.6rem">${t.emoji}</div>`,
      choices: shuffle(pool).map(w => ({ label: w.word.toUpperCase(), correct: w.word === t.word })) };
  }
  const CASTLE_Q = [qLetter, qCount, qFirstSound, qColor, qRead];

  function castle() {
    cPos = 0; cBusy = false;
    renderCastleMap();
    cq().innerHTML = "";
    App.flamingo("Help Princess Riley get back to her castle! Get it right to move closer!");
    setTimeout(askCastle, 2600);
  }
  function askCastle() {
    const q = rand(CASTLE_Q)();
    App.flamingo(q.say);
    cq().innerHTML =
      (q.big ? `<div class="castle-big">${q.big}</div>` : "") +
      `<div class="choices">${q.choices.map((c, i) =>
        `<button class="choice${c.cls ? " " + c.cls : ""}" data-i="${i}"${c.style ? ` style="${c.style}"` : ""}>${c.label}</button>`
      ).join("")}</div>`;
    cq().querySelectorAll(".choice").forEach(b => b.onclick = () => {
      if (cBusy) return;
      onCastlePick(b, q.choices[+b.dataset.i].correct);
    });
  }
  function onCastlePick(btn, correct) {
    cBusy = true;
    if (correct) {
      btn.classList.add("correct");
      App.reward(1);
      cPos = Math.min(GOAL, cPos + 1); renderCastleMap();
      if (cPos >= GOAL) return winCastle();
      App.flamingo("Yes! One step closer!");
      setTimeout(() => { cBusy = false; askCastle(); }, 1200);
    } else {
      btn.classList.add("wrong");
      cPos = Math.max(0, cPos - 1); renderCastleMap();
      App.flamingo("Oops! One step back. You can do it!");
      setTimeout(() => { cBusy = false; askCastle(); }, 1700);
    }
  }
  function winCastle() {
    App.burst("🏰"); App.reward(3);
    App.flamingo("You made it to the castle! Hooray, Princess Riley!");
    setTimeout(() => App.burst("🎆"), 700);
    setTimeout(() => { cPos = 0; renderCastleMap(); cBusy = false; askCastle(); }, 3400);
  }

  return { colors, findLetter, counting, firstSound, castle };
})();
