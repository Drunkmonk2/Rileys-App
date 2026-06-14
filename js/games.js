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

  /* ---- COLORS: "Tap the red one!" -------------------------------------- */
  function colors() {
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
        App.win(`Yes! That's ${target.name}! 🎉`, colors, "games", "colors");
      } else {
        b.classList.add("wrong");
        App.flamingo(`Oops! That's ${b.dataset.name}. Try the ${target.name} one!`);
      }
    });
  }

  /* ---- FIND THE LETTER ------------------------------------------------- */
  function findLetter() {
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
        App.win(`Great! That's ${target.letter}! ⭐`, findLetter, "games", "letterHunt");
      } else {
        b.classList.add("wrong");
        App.flamingo(`That's ${b.dataset.l}. We want ${target.letter}!`);
      }
    });
  }

  /* ---- COUNTING: count the emojis, tap the number ---------------------- */
  function counting() {
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
        App.win(`That's right — ${n}! 🎉`, counting, "games", "counting");
      } else {
        b.classList.add("wrong");
        App.flamingo(`Let's count again together: one, two, three...`);
      }
    });
  }
  function clampDiff(n, d) { return Math.max(1, Math.min(12, n + d)); }

  /* ---- FIRST SOUND (phonemic awareness) ------------------------------- */
  function firstSound() {
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
        App.win(`Yes! ${item.word} starts with ${item.first} — ${item.sound}! ⭐`, firstSound, "games", "firstSound");
      } else {
        b.classList.add("wrong");
        App.flamingo(`Listen again... ${item.sound}... ${item.word}.`);
      }
    });
  }

  return { colors, findLetter, counting, firstSound };
})();
