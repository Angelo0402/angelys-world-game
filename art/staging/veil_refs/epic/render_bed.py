# Offline render of the game's procedural themes (AudioManager SONGS data)
# into WAV beds for the epic cutscenes. Approximation of the synth voices:
# saw bass, square lead, sine/triangle pad — mixed low under dialogue.
import numpy as np, sys
from scipy.io import wavfile

SR = 44100
MINOR = [0, 2, 3, 5, 7, 8, 10]
MAJOR = [0, 2, 4, 5, 7, 9, 11]
SONGS = {
    "boss":    dict(bpm=152, root=50, scale=MINOR, chords=[0, 0, 5, 6],
                    lead=[0, 7, 0, 6, 0, 5, 4, 3, 0, 7, 0, 8, 7, 6, 5, 4]),
    "victory": dict(bpm=140, root=60, scale=MAJOR, chords=[0, 4],
                    lead=[0, 2, 4, 7, None, 4, 7, None, 9, 9, 9, 11, 14, None, None, None]),
    "shadow":  dict(bpm=100, root=55, scale=MINOR, chords=[0, 5, 3, 6],
                    lead=[0, None, 3, None, 2, 0, None, 4, 3, None, 2, None, 0, None, -1, None]),
}
def deg2semi(scale, d):
    return scale[d % 7] + 12 * (d // 7) if d >= 0 else scale[d % 7] + 12 * ((d // 7))
def midi_hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def wave(kind, ph):
    if kind == "saw": return 2 * (ph % 1) - 1
    if kind == "square": return np.where(ph % 1 < 0.5, 1.0, -1.0)
    if kind == "tri": return 2 * np.abs(2 * (ph % 1) - 1) - 1
    return np.sin(2 * np.pi * ph)
def render(song, seconds, out):
    s = SONGS[song]
    step = 60 / s["bpm"] / 4  # 16th notes
    n = int(seconds * SR)
    t = np.arange(n) / SR
    mix = np.zeros(n)
    bar_steps = 16
    total_steps = int(seconds / step)
    for st in range(total_steps):
        t0 = st * step
        i0 = int(t0 * SR); i1 = min(n, int((t0 + step) * SR))
        if i0 >= n: break
        bar = st // bar_steps
        chord_deg = s["chords"][bar % len(s["chords"])]
        chord_root = s["root"] + deg2semi(s["scale"], chord_deg)
        seg_t = t[i0:i1] - t0
        # bass: chord root -12 on steps 0,4,8,12 (and 14 pickup)
        if st % 16 in (0, 4, 8, 12, 14):
            f = midi_hz(chord_root - 12)
            env = np.exp(-seg_t * 5)
            mix[i0:i1] += 0.30 * wave("saw", f * (t[i0:i1])) * 0  # placeholder
            ph = f * seg_t
            mix[i0:i1] += 0.26 * (2 * (ph % 1) - 1) * env
        # lead
        ld = s["lead"][st % 16]
        if ld is not None:
            f = midi_hz(s["root"] + 12 + deg2semi(s["scale"], ld))
            ph = f * seg_t
            env = np.exp(-seg_t * 7)
            mix[i0:i1] += 0.10 * np.where(ph % 1 < 0.5, 1.0, -1.0) * env
        # pad: full bar triad, added once per bar
        if st % 16 == 0:
            j1 = min(n, int((t0 + step * 16) * SR))
            pt = t[i0:j1] - t0
            for iv in (0, 2, 4):
                f = midi_hz(chord_root + deg2semi(s["scale"], iv))
                mix[i0:j1] += 0.045 * np.sin(2 * np.pi * f * pt)
    # gentle master fade handled by ffmpeg; soft clip
    mix = np.tanh(mix * 1.2) * 0.8
    stereo = np.stack([mix, mix], axis=1)
    wavfile.write(out, SR, (stereo * 32767).astype(np.int16))
    print("wrote", out)
if __name__ == "__main__":
    render(sys.argv[1], float(sys.argv[2]), sys.argv[3])
