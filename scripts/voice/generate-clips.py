#!/usr/bin/env python3
"""
generate-clips.py — turn scripts/voice/phrases.json into human-voice MP3 clips.

Uses Piper (open-source neural TTS) to synthesize every line once, encodes each
to a small mono MP3, and writes audio/manifest.json mapping each phrase key to
its clip. The app (js/speech.js) then plays these instead of the robotic
browser voice, falling back to the device voice for anything without a clip.

Prereqs (installed on the build machine, not shipped):
    pip install piper-tts imageio-ffmpeg
    python3 -m piper.download_voices en_US-amy-medium   # ~63 MB model

Run from the repo root:
    node scripts/voice/enumerate-phrases.js
    python3 scripts/voice/generate-clips.py
"""
import json, hashlib, os, subprocess, wave, sys
import imageio_ffmpeg
from piper import PiperVoice

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL = os.environ.get("PIPER_MODEL", "/tmp/en_US-amy-medium.onnx")
PHRASES = os.path.join(REPO, "scripts", "voice", "phrases.json")
OUT_DIR = os.path.join(REPO, "audio", "clips")
MANIFEST = os.path.join(REPO, "audio", "manifest.json")
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

def main():
    if not os.path.exists(MODEL):
        sys.exit(f"Piper model not found at {MODEL}. See header for download step.")
    os.makedirs(OUT_DIR, exist_ok=True)
    phrases = json.load(open(PHRASES))
    voice = PiperVoice.load(MODEL)
    manifest = {}
    tmp_wav = "/tmp/_clip.wav"

    for i, p in enumerate(phrases, 1):
        key, text = p["key"], p["text"]
        h = hashlib.sha1(key.encode("utf-8")).hexdigest()[:12]
        mp3 = os.path.join(OUT_DIR, f"{h}.mp3")
        rel = f"audio/clips/{h}.mp3"
        manifest[key] = rel
        if os.path.exists(mp3):           # incremental: skip already-built clips
            continue
        with wave.open(tmp_wav, "wb") as wf:
            voice.synthesize_wav(text or key, wf)
        subprocess.run(
            [FFMPEG, "-y", "-i", tmp_wav, "-ac", "1", "-ar", "22050", "-b:a", "48k", mp3],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if i % 50 == 0:
            print(f"  ...{i}/{len(phrases)}")

    json.dump(manifest, open(MANIFEST, "w"), indent=0)
    total = sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in os.listdir(OUT_DIR))
    print(f"Done: {len(manifest)} clips, {total/1024/1024:.1f} MB in audio/clips/")

if __name__ == "__main__":
    main()
