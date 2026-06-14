/* ============================================================================
 * data.js  —  Riley's curriculum
 * ----------------------------------------------------------------------------
 * Everything Flamingo Flamingo teaches lives here so it's easy to tweak.
 * Examples are tied to Riley's favorite things: princesses, soccer, football,
 * softball, basketball, baking and coloring.  Letter "sounds" are written the
 * way Flamingo should SAY them, not the letter name.
 * ==========================================================================*/

const CHILD = {
  name: "Riley",
};

/* ----- The alphabet -------------------------------------------------------
 * sound   : how the letter sounds (phonics), spoken slowly by Flamingo
 * word     : an example word Riley knows / loves
 * emoji    : a picture to go with the word
 * --------------------------------------------------------------------------*/
const LETTERS = [
  { letter: "A", sound: "ah",  word: "Apple",      emoji: "🍎" },
  { letter: "B", sound: "buh", word: "Ball",       emoji: "⚽" },
  { letter: "C", sound: "kuh", word: "Crown",      emoji: "👑" },
  { letter: "D", sound: "duh", word: "Dog",        emoji: "🐶" },
  { letter: "E", sound: "eh",  word: "Egg",        emoji: "🥚" },
  { letter: "F", sound: "fff", word: "Flamingo",   emoji: "🦩" },
  { letter: "G", sound: "guh", word: "Goal",       emoji: "🥅" },
  { letter: "H", sound: "huh", word: "Hat",        emoji: "👒" },
  { letter: "I", sound: "ih",  word: "Igloo",      emoji: "🧊" },
  { letter: "J", sound: "juh", word: "Jump",       emoji: "🤸" },
  { letter: "K", sound: "kuh", word: "Kick",       emoji: "🦵" },
  { letter: "L", sound: "luh", word: "Lollipop",   emoji: "🍭" },
  { letter: "M", sound: "mmm", word: "Mom",        emoji: "👩" },
  { letter: "N", sound: "nnn", word: "Net",        emoji: "🥅" },
  { letter: "O", sound: "ah",  word: "Octopus",    emoji: "🐙" },
  { letter: "P", sound: "puh", word: "Princess",   emoji: "👸" },
  { letter: "Q", sound: "kwuh",word: "Queen",      emoji: "👑" },
  { letter: "R", sound: "rrr", word: "Riley",      emoji: "🌟" }, // R is for Riley!
  { letter: "S", sound: "sss", word: "Soccer",     emoji: "⚽" },
  { letter: "T", sound: "tuh", word: "Touchdown",  emoji: "🏈" },
  { letter: "U", sound: "uh",  word: "Umbrella",   emoji: "☔" },
  { letter: "V", sound: "vvv", word: "Violin",     emoji: "🎻" },
  { letter: "W", sound: "wuh", word: "Whisk",      emoji: "🥄" },
  { letter: "X", sound: "ks",  word: "Fox",        emoji: "🦊" },
  { letter: "Y", sound: "yuh", word: "Yarn",       emoji: "🧶" },
  { letter: "Z", sound: "zzz", word: "Zebra",      emoji: "🦓" },
];

/* ----- Science-of-Reading teaching order ----------------------------------
 * Top structured-literacy programs (Orton-Gillingham, UFLI, etc.) do NOT teach
 * letters A→Z.  They teach the highest-utility letters first so a child can
 * BUILD REAL WORDS almost immediately, which is hugely motivating.
 * This order lets Riley spell sat, pin, tap, nap... after just the first group.
 * Flamingo introduces letters in this sequence; A–Z stays available as review.
 * --------------------------------------------------------------------------*/
const TEACHING_SEQUENCE = [
  ["S","A","T","P","I","N"],          // can already make: sat, tap, pin, nap, pat, tin
  ["M","D","G","O","C","K"],          // mad, dog, got, cot, kid
  ["E","U","R","H","B","F","L"],      // red, run, hat, bed, fun, leg
  ["J","V","W","X","Y","Z","Q"],      // the trickier / lower-frequency letters last
];

/* ----- Phonemic awareness: hearing the FIRST sound in a word --------------
 * Before reading comes hearing sounds. This drives the "What sound do you
 * hear first?" game — pure listening, the #1 predictor of later reading.
 * --------------------------------------------------------------------------*/
const FIRST_SOUND_WORDS = [
  { word: "soccer",   first: "S", sound: "sss", emoji: "⚽" },
  { word: "princess", first: "P", sound: "puh", emoji: "👸" },
  { word: "ball",     first: "B", sound: "buh", emoji: "🏀" },
  { word: "cupcake",  first: "C", sound: "kuh", emoji: "🧁" },
  { word: "flamingo", first: "F", sound: "fff", emoji: "🦩" },
  { word: "dog",      first: "D", sound: "duh", emoji: "🐶" },
  { word: "moon",     first: "M", sound: "mmm", emoji: "🌙" },
  { word: "sun",      first: "S", sound: "sss", emoji: "☀️" },
  { word: "tiara",    first: "T", sound: "tuh", emoji: "👑" },
  { word: "net",      first: "N", sound: "nnn", emoji: "🥅" },
];

/* ----- Numbers 0–20 -------------------------------------------------------*/
const NUMBERS = [];
for (let n = 0; n <= 20; n++) {
  NUMBERS.push({ value: n, word: numberWord(n) });
}
function numberWord(n) {
  const words = ["zero","one","two","three","four","five","six","seven","eight",
    "nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen",
    "seventeen","eighteen","nineteen","twenty"];
  return words[n];
}

/* ----- Spelling: simple sound-it-out (CVC) words --------------------------
 * Each word is broken into the sounds Riley should blend together.
 * Kept to easy 3-letter words so a 3½ year old can succeed.
 * --------------------------------------------------------------------------*/
const SPELLING_WORDS = [
  { word: "cat", sounds: ["kuh","ah","tuh"], emoji: "🐱" },
  { word: "dog", sounds: ["duh","ah","guh"], emoji: "🐶" },
  { word: "sun", sounds: ["sss","uh","nnn"], emoji: "☀️" },
  { word: "hat", sounds: ["huh","ah","tuh"], emoji: "👒" },
  { word: "bat", sounds: ["buh","ah","tuh"], emoji: "🦇" },
  { word: "cup", sounds: ["kuh","uh","puh"], emoji: "🧁" },
  { word: "mom", sounds: ["mmm","ah","mmm"], emoji: "👩" },
  { word: "pig", sounds: ["puh","ih","guh"], emoji: "🐷" },
  { word: "bed", sounds: ["buh","eh","duh"], emoji: "🛏️" },
  { word: "box", sounds: ["buh","ah","ks"],  emoji: "📦" },
  { word: "ball",sounds: ["buh","ah","luh"], emoji: "⚽" },
  { word: "fun", sounds: ["fff","uh","nnn"], emoji: "🎉" },
];

/* ----- Colors (for the color mini-game) ----------------------------------*/
const COLORS = [
  { name: "red",    hex: "#ef4444" },
  { name: "orange", hex: "#f97316" },
  { name: "yellow", hex: "#facc15" },
  { name: "green",  hex: "#22c55e" },
  { name: "blue",   hex: "#3b82f6" },
  { name: "purple", hex: "#a855f7" },
  { name: "pink",   hex: "#ec4899" },
  { name: "brown",  hex: "#92400e" },
];

/* ----- Reward stickers (themed to Riley's favorites) ----------------------*/
const STICKERS = [
  { id: "flamingo",   emoji: "🦩", label: "Flamingo" },
  { id: "crown",      emoji: "👑", label: "Princess Crown" },
  { id: "soccer",     emoji: "⚽", label: "Soccer Ball" },
  { id: "football",   emoji: "🏈", label: "Football" },
  { id: "softball",   emoji: "🥎", label: "Softball" },
  { id: "basketball", emoji: "🏀", label: "Basketball" },
  { id: "cupcake",    emoji: "🧁", label: "Cupcake" },
  { id: "crayon",     emoji: "🖍️", label: "Crayon" },
  { id: "star",       emoji: "⭐", label: "Gold Star" },
  { id: "rainbow",    emoji: "🌈", label: "Rainbow" },
  { id: "trophy",     emoji: "🏆", label: "Trophy" },
  { id: "unicorn",    emoji: "🦄", label: "Unicorn" },
];
