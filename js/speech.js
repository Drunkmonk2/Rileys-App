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

  // Pick a pleasant English voice once the list is available.
  function pickVoice() {
    const voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    if (!voices.length) return;
    voice =
      voices.find(v => /Samantha|Karen|Moira|Tessa|Female/i.test(v.name) && /en/i.test(v.lang)) ||
      voices.find(v => /en-US/i.test(v.lang)) ||
      voices.find(v => /^en/i.test(v.lang)) ||
      voices[0];
  }
  if (window.speechSynthesis) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  /* Flamingo says something. Returns a promise that resolves when done so we
   * can chain instructions naturally. rate is a bit slow & friendly for kids. */
  function say(text, { rate = 0.92, pitch = 1.15 } = {}) {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) { resolve(); return; }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.rate = rate; u.pitch = pitch;
      u.onend = resolve; u.onerror = resolve;
      speechSynthesis.speak(u);
    });
  }

  /* Sound out a single phonics sound slowly (e.g. "sss", "ah"). */
  function saySound(sound) {
    return say(sound, { rate: 0.7, pitch: 1.1 });
  }

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

  return { say, saySound, listen, supported };
})();
