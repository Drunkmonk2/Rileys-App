/* ============================================================================
 * speech.js — Flamingo's voice (out) and Riley's voice (in)
 * ----------------------------------------------------------------------------
 * SPEAK : uses the phone's built-in text-to-speech (on-device, free, offline).
 * LISTEN: uses the browser's SpeechRecognition. On iPhone Safari this is Apple's
 *         recognizer. For a future fully-native build we'd swap in
 *         SFSpeechRecognizer(requiresOnDeviceRecognition: true) — the rest of
 *         the app wouldn't change because everything goes through this module.
 * ==========================================================================*/

const Speech = (() => {
  let voice = null;
  let preferredURI = null;     // a grown-up's chosen voice (saved in settings)
  let baseRate = 0.8;         // friendly, slow default for a 3-year-old

  /* ---- pre-recorded human-voice clips ----------------------------------
   * audio/manifest.json maps a normalized phrase -> mp3 file. When a clip
   * exists we play the real voice; otherwise we fall back to the device's
   * text-to-speech. normalizeKey MUST match scripts/voice/enumerate-phrases.js */
  let clipMap = null;
  let currentAudio = null;
  const normalizeKey = (t) =>
    String(t).toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();

  fetch("audio/manifest.json")
    .then(r => r.ok ? r.json() : null)
    .then(m => { if (m) clipMap = m; })
    .catch(() => {});

  function stopAll() {
    if (currentAudio) { try { currentAudio.pause(); } catch {} currentAudio = null; }
    if (window.speechSynthesis) { try { speechSynthesis.cancel(); } catch {} }
  }
  function playClip(url) {
    return new Promise((resolve) => {
      const a = new Audio(url);
      currentAudio = a;
      a.onended = () => resolve();
      a.onerror = () => resolve();
      a.play().catch(() => resolve());
    });
  }
  function clipFor(text) {
    if (!clipMap) return null;
    return clipMap[normalizeKey(text)] || null;
  }

  function allVoices() {
    return window.speechSynthesis ? speechSynthesis.getVoices() : [];
  }

  // Pick the nicest available English voice. iPhone "Enhanced/Premium" voices
  // (downloaded by the parent) sound far more human, so we prefer those.
  function pickVoice() {
    const voices = allVoices();
    if (!voices.length) return;
    if (preferredURI) {
      const chosen = voices.find(v => v.voiceURI === preferredURI);
      if (chosen) { voice = chosen; return; }
    }
    voice =
      voices.find(v => /^en/i.test(v.lang) && /(enhanced|premium|siri)/i.test(v.name)) ||
      voices.find(v => /Samantha|Karen|Moira|Tessa/i.test(v.name) && /en/i.test(v.lang)) ||
      voices.find(v => /en-US/i.test(v.lang)) ||
      voices.find(v => /^en/i.test(v.lang)) ||
      voices[0];
  }
  if (window.speechSynthesis) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  /* Flamingo says something. Plays the pre-recorded human clip when we have
   * one; otherwise uses the device voice. Pass { device:true } to force the
   * device voice (used by the dashboard's voice tester). Returns a promise
   * that resolves when done so we can chain instructions naturally. */
  function say(text, opts = {}) {
    stopAll();
    if (!opts.device) {
      const clip = clipFor(text);
      if (clip) return playClip(clip);
    }
    return speakDevice(text, opts);
  }

  function speakDevice(text, { rate, pitch = 1.12 } = {}) {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) { resolve(); return; }
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.rate = rate || baseRate; u.pitch = pitch;
      u.onend = resolve; u.onerror = resolve;
      speechSynthesis.speak(u);
    });
  }

  /* Sound out a single phonics sound (clip if available, else slow device). */
  function saySound(sound) {
    stopAll();
    const clip = clipFor(sound);
    if (clip) return playClip(clip);
    return speakDevice(sound, { rate: Math.max(0.45, baseRate - 0.25), pitch: 1.08 });
  }

  /* ---- grown-up voice controls (used by the parent dashboard) ----------- */
  function getEnglishVoices() {
    return allVoices()
      .filter(v => /^en/i.test(v.lang))
      .map(v => ({ name: v.name, uri: v.voiceURI, lang: v.lang }));
  }
  function setVoice(uri) { preferredURI = uri; pickVoice(); }
  function setRate(r) { baseRate = r; }
  function getRate() { return baseRate; }
  function currentVoiceURI() { return voice ? voice.voiceURI : null; }

  // When wrapped in the native iOS app, a Swift bridge exposes on-device
  // (offline, private) speech recognition. We prefer it when present.
  const nativeBridge =
    window.webkit && window.webkit.messageHandlers &&
    window.webkit.messageHandlers.nativeSpeech;

  const supported = !!nativeBridge ||
    "webkitSpeechRecognition" in window || "SpeechRecognition" in window;

  /* Ask the native iOS layer to listen on-device. Swift calls back into
   * window.__nativeSpeechResult(text) when done. */
  function listenNative({ onStart } = {}) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (text) => { if (done) return; done = true;
        resolve({ ok: true, text: (text || "").trim().toLowerCase() }); };
      window.__nativeSpeechResult = finish;
      if (onStart) onStart();
      try { nativeBridge.postMessage("listen"); } catch { finish(""); }
      setTimeout(() => finish(""), 7000);
    });
  }

  /* Listen once and return the best transcript (lowercased) or "".
   * Calls onStart so the UI can show the mic pulsing. */
  function listen({ onStart } = {}) {
    if (nativeBridge) return listenNative({ onStart });
    return new Promise((resolve) => {
      if (!supported) { resolve({ ok: false, text: "" }); return; }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const r = new SR();
      r.lang = "en-US";
      r.interimResults = false;
      r.maxAlternatives = 5;
      let done = false;
      const finish = (text) => { if (done) return; done = true; resolve({ ok: true, text }); };

      r.onstart = () => onStart && onStart();
      r.onresult = (e) => {
        let best = "";
        for (const alt of e.results[0]) {
          best += " " + alt.transcript;
        }
        finish(best.trim().toLowerCase());
      };
      r.onerror = () => finish("");
      r.onend = () => finish("");
      try { r.start(); } catch { finish(""); }
      // Safety: never hang forever waiting on a wiggly toddler.
      setTimeout(() => { try { r.stop(); } catch {} }, 6000);
    });
  }

  return { say, saySound, listen, supported,
           getEnglishVoices, setVoice, setRate, getRate, currentVoiceURI };
})();
