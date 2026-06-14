#!/usr/bin/env python3
"""
generate-clips-elevenlabs.py — regenerate Flamingo's voice clips with
ElevenLabs (premium, very human voices), keeping the exact same offline/
pre-recorded approach. Filenames/keys match the Piper output, so swapping the
voice needs NO app code changes — just rerun this and bump the cache.

Setup:
    pip install requests
    export ELEVENLABS_API_KEY=sk_xxx        # your key (never commit it)
    export ELEVEN_VOICE_ID=21m00Tcm4TlvDq8ikWAM   # optional; default = Rachel
    export ELEVEN_MODEL=eleven_multilingual_v2    # optional

Run from the repo root:
    node    scripts/voice/enumerate-phrases.js     # refresh phrases.json
    python3 scripts/voice/generate-clips-elevenlabs.py

Cost note: ~713 short phrases ≈ ~20–25k characters. ElevenLabs' free tier
(10k chars/mo) isn't enough; the $5 Starter plan (30k) covers a full run.
"""
import json, hashlib, os, sys, time
import urllib.request, urllib.error

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PHRASES = os.path.join(REPO, "scripts", "voice", "phrases.json")
OUT_DIR = os.path.join(REPO, "audio", "clips")
MANIFEST = os.path.join(REPO, "audio", "manifest.json")

API_KEY = os.environ.get("ELEVENLABS_API_KEY")
VOICE_ID = os.environ.get("ELEVEN_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # Rachel
MODEL = os.environ.get("ELEVEN_MODEL", "eleven_multilingual_v2")
FORCE = os.environ.get("FORCE", "1") == "1"   # default: overwrite (voice swap)

def synth(text):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}?output_format=mp3_44100_64"
    body = json.dumps({
        "text": text,
        "model_id": MODEL,
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "style": 0.15},
    }).encode()
    req = urllib.request.Request(url, data=body, headers={
        "xi-api-key": API_KEY, "Content-Type": "application/json", "Accept": "audio/mpeg",
    })
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429:                      # rate limited — back off
                time.sleep(2 * (attempt + 1)); continue
            sys.exit(f"ElevenLabs error {e.code}: {e.read().decode()[:200]}")
        except Exception as e:
            time.sleep(2 * (attempt + 1))
    sys.exit("Too many retries.")

def main():
    if not API_KEY:
        sys.exit("Set ELEVENLABS_API_KEY first.")
    os.makedirs(OUT_DIR, exist_ok=True)
    phrases = json.load(open(PHRASES))
    manifest = {}
    for i, p in enumerate(phrases, 1):
        key, text = p["key"], p["text"]
        h = hashlib.sha1(key.encode("utf-8")).hexdigest()[:12]
        mp3 = os.path.join(OUT_DIR, f"{h}.mp3")
        manifest[key] = f"audio/clips/{h}.mp3"
        if os.path.exists(mp3) and not FORCE:
            continue
        with open(mp3, "wb") as f:
            f.write(synth(text or key))
        if i % 25 == 0:
            print(f"  ...{i}/{len(phrases)}")
        time.sleep(0.2)
    json.dump(manifest, open(MANIFEST, "w"), indent=0)
    total = sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in os.listdir(OUT_DIR))
    print(f"Done: {len(manifest)} clips, {total/1024/1024:.1f} MB")

if __name__ == "__main__":
    main()
