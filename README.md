# 🦩 Riley's Reading Adventure

A personalized, gamified learning app for **Riley** (age 3½), taught by her
mascot **Flamingo Flamingo**. It teaches letters, letter *sounds*, numbers,
and how to blend sounds into words — with a microphone so Riley says things
back, and finger-tracing that the app actually checks.

Built as a **web app (PWA)** so it goes on your iPhone with no App Store, no
Apple Developer account, and no Xcode. Add it to your home screen and it
behaves like a real app (full screen, works offline).

---

## 📚 Why it's built this way: the Science of Reading

You're right that reading is in crisis — and there's a clear reason. For
decades many schools taught kids to *guess* words from pictures and context
(the "three-cueing" / balanced-literacy approach). Research has now
decisively shown that fails a huge number of children. The kids who read
best — the trajectory you want for Riley — are taught with **structured
literacy / systematic phonics**, the "Science of Reading."

This app follows that evidence base on purpose:

1. **Phonemic awareness first.** Before letters comes *hearing sounds*. The
   **Sounds / First Sound** game trains the single biggest predictor of later
   reading: noticing the sounds inside spoken words.
2. **Letter *sounds*, explicitly.** Flamingo always teaches "B says /b/," not
   just the letter name. Decoding requires sounds, not names.
3. **High-utility teaching order, not A→Z.** Top programs (Orton-Gillingham,
   UFLI) introduce `s, a, t, p, i, n` first so a child can build *real words*
   almost immediately. That order is encoded in `TEACHING_SEQUENCE` in
   `js/data.js`.
4. **Blending & segmenting.** Spelling has Riley hear each sound and put the
   letters in order to *build* the word — the core decoding skill.
5. **Multi-sensory.** She hears it, says it (mic), and traces it (finger) —
   linking sound, shape, and motion.
6. **Explicit, immediate feedback.** No guessing-and-moving-on. When she's
   wrong, Flamingo models the correct sound right away, then lets her retry.
7. **Mastery through joyful repetition.** Short rounds, constant praise,
   stars and themed stickers keep her coming back.

> This is a strong, research-aligned *foundation* — not a replacement for a
> full structured-literacy curriculum or a reading specialist. As Riley grows
> we add digraphs (sh, ch, th), long vowels, and decodable sentences.

---

## 📱 Get it on your iPhone (about 5 minutes, free)

The easiest way is **GitHub Pages** (free hosting straight from this repo):

1. Push this branch and open the repo on GitHub.
2. Go to **Settings → Pages**.
3. Under "Build and deployment," set **Source: Deploy from a branch**, pick
   the branch (`claude/rileys-learning-app-a1hqty` or `main` after you merge),
   folder **/ (root)**, and **Save**.
4. Wait ~1 minute. GitHub shows a URL like
   `https://<your-username>.github.io/rileys-app/`.
5. On your iPhone, open that URL **in Safari**.
6. Tap the **Share** button (the square with the up-arrow) → **Add to Home
   Screen** → **Add**.
7. Tap the new 🦩 icon. It opens full screen like a real app.

**First time:** tap the screen once so iOS lets Flamingo talk (Safari blocks
audio until the child taps). For the microphone, Safari will ask permission —
tap **Allow**.

### Just want to test it on a computer first?
From this folder run:
```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000`. (Microphone & "Add to Home Screen" need the
real HTTPS GitHub Pages URL on the phone, but everything else works locally.)

---

## 🎮 What's inside

| Section | What Riley does |
|---|---|
| **⭐ Let's Learn!** | A guided lesson that focuses on what she hasn't mastered yet and **weaves the mini-games (colors, letter hunt, counting, first-sound) right into the learning** — no separate "games" section. |
| **🔤 Letters** | Taught in science-of-reading order; hear the **sound**, **Say it** (mic), or **Trace it** with a green start dot + stroke-direction arrows and a "Watch" demo. |
| **🔢 Numbers** | Start at 1, see the quantity, **Count with me** (points & counts aloud), say it, trace it. |
| **📖 Read Words** | The payoff: blend the sounds and **read the whole word** out loud. |
| **📝 Spelling** | Sound out a word and tap the letters in order to build it. |
| **🏆 My Stickers** | Every 5 stars earns a themed sticker, with a full-screen celebration + chime. |
| **🔒 Grown-ups** | Math-gated **parent dashboard**: mastery of letters/numbers/words, backup-voice settings, and a **Reset progress** button. |

Everything is personalized to **Riley** and themed around **princesses,
soccer, football, softball, basketball, baking, and coloring**.

### Flamingo's voice
Flamingo speaks with **pre-recorded human-voice clips** (generated once with
the open-source [Piper](https://github.com/rhasspy/piper) neural TTS) — they
sound natural, play instantly, and work offline. Any line without a clip falls
back to the device's built-in voice (adjustable under **Grown-ups → Backup
Voice**). To (re)generate the clips after changing wording or curriculum:
```bash
pip install piper-tts imageio-ffmpeg
python3 -m piper.download_voices en_US-amy-medium
node   scripts/voice/enumerate-phrases.js
python3 scripts/voice/generate-clips.py
```

### How recognition works
- **Tracing** is checked **entirely on the phone** — the app renders the
  target letter, then measures how well Riley's finger covered it. Nothing
  leaves the device.
- **Speaking** uses Safari's built-in speech recognition for v1. (For a future
  fully-offline native version we'd swap in Apple's on-device
  `SFSpeechRecognizer`; all speech goes through `js/speech.js` so only that one
  file changes.)

---

## 🗂️ Project layout
```
index.html          App shell + all screens
manifest.json       Makes it installable as an app
service-worker.js   Offline caching
css/styles.css      Kid-friendly styling
js/data.js          Curriculum (letters, sounds, words, sequence, stickers)
js/speech.js        Flamingo's voice (TTS) + listening (speech recognition)
js/tracing.js       On-device finger-tracing recognition
js/games.js         Mini-games
js/app.js           Navigation, lessons, rewards, progress + parent dashboard
audio/              Pre-recorded human-voice clips + manifest.json
scripts/voice/      Tools that generate the voice clips (Piper TTS)
icons/              App icons
ios/                Native iOS wrapper (Mac/cloud build) — see ios/README.md
```

## 🛣️ Ideas for next versions
- Animated mascot reactions (Flamingo cheering, pointing, blinking).
- Digraphs (sh/ch/th), long vowels, and first decodable sentences.
- TestFlight distribution of the native iOS app (guaranteed offline on-device speech).
- Record-and-playback so Riley hears her own voice.

> A native iOS wrapper already exists in **`ios/`** (WKWebView + on-device
> `SFSpeechRecognizer`). Building it needs a Mac or a cloud macOS runner —
> see [`ios/README.md`](ios/README.md). For a PC + iPhone, the PWA above is
> the recommended path and needs no Mac.

---
*Made with love for Riley. Go turn her into a genius. 🦩⭐*
