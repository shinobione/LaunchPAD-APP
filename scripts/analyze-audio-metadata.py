from __future__ import annotations

import json
from pathlib import Path

import librosa
import numpy as np

TRACKS = {
    "before-the-noise": "audio/before-the-noise.mp3",
    "low-bitrate-love": "audio/low-bitrate-love.mp3",
    "thick": "audio/thick.mp3",
    "real-love-doesnt-rush": "audio/real-love-doesnt-rush.mp3",
    "jusquau-dernier-souffle": "audio/jusquau-dernier-souffle.mp3",
    "tinh-bolero-cho-tran": "audio/tinh-bolero-cho-tran.mp3",
    "saigon-bound": "audio/saigon-bound.mp3",
    "the-throne-resonates": "audio/the-throne-resonates.mp3",
    "carved-from-pressure": "audio/carved-from-pressure.mp3",
    "ligne-3": "audio/ligne-3.mp3",
    "obey": "audio/albums/coal-to-diamond/obey.mp3",
    "close-to-you": "audio/singles/close-to-you.mp3",
    "ghost-signal": "audio/singles/ghost-signal.mp3",
    "husband": "audio/singles/husband.mp3",
}

KEY_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def estimate_key(chroma: np.ndarray) -> tuple[str, float]:
    profile = np.mean(chroma, axis=1)
    profile = (profile - profile.mean()) / (profile.std() or 1.0)
    candidates: list[tuple[float, str]] = []

    for tonic, name in enumerate(KEY_NAMES):
        major = np.roll(MAJOR_PROFILE, tonic)
        minor = np.roll(MINOR_PROFILE, tonic)
        major_score = float(np.corrcoef(profile, major)[0, 1])
        minor_score = float(np.corrcoef(profile, minor)[0, 1])
        candidates.append((major_score, f"{name} major"))
        candidates.append((minor_score, f"{name} minor"))

    candidates.sort(reverse=True)
    best_score, best_key = candidates[0]
    second_score = candidates[1][0]
    confidence = max(0.0, min(1.0, (best_score - second_score + 0.15) / 0.45))
    return best_key, round(confidence, 3)


def analyze(track_id: str, relative_path: str) -> dict[str, object]:
    path = Path(relative_path)
    y, sample_rate = librosa.load(path, sr=22050, mono=True)
    duration = float(librosa.get_duration(y=y, sr=sample_rate))

    harmonic, percussive = librosa.effects.hpss(y)
    tempo_value, _ = librosa.beat.beat_track(y=percussive, sr=sample_rate)
    tempo = float(np.asarray(tempo_value).reshape(-1)[0])

    chroma = librosa.feature.chroma_cqt(y=harmonic, sr=sample_rate)
    musical_key, key_confidence = estimate_key(chroma)

    return {
        "id": track_id,
        "file": relative_path,
        "durationSeconds": round(duration, 2),
        "bpm": int(round(tempo)),
        "key": musical_key,
        "keyConfidence": key_confidence,
    }


results = [analyze(track_id, path) for track_id, path in TRACKS.items()]
print("AUDIO_METADATA_BEGIN")
print(json.dumps(results, ensure_ascii=False, indent=2))
print("AUDIO_METADATA_END")
