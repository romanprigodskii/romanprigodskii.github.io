#!/usr/bin/env python3
"""Palette definitions for the site, with a contrast check.

Every palette fills the same slots, so swapping one is a single attribute on
<html>. Run this file to print the contrast of every text/ground pair on every
surface of every palette, and to emit the CSS block.

    python3 tools/palettes.py            # report
    python3 tools/palettes.py --css      # CSS for site.css
"""
import math, sys

def oklch_to_srgb(L, C, h):
    a = C * math.cos(math.radians(h)); b = C * math.sin(math.radians(h))
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    def enc(v):
        v = min(1, max(0, v))
        return 12.92 * v if v <= 0.0031308 else 1.055 * v ** (1 / 2.4) - 0.055
    return [enc(v) for v in (r, g, bb)]

def lum(rgb):
    return sum(w * (c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
               for w, c in zip((0.2126, 0.7152, 0.0722), rgb))

def ratio(a, b):
    la, lb = lum(oklch_to_srgb(*a)), lum(oklch_to_srgb(*b))
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

def hexof(c):
    return "#" + "".join(f"{round(v * 255):02x}" for v in oklch_to_srgb(*c))

# slot: (L, C, h)
PALETTES = {
    # Grey, black and white, one signal in the sky.
    "graphite": {
        "d950": (0.115, 0.004, 262), "d900": (0.145, 0.004, 262), "d800": (0.175, 0.005, 262),
        "d700": (0.222, 0.005, 262), "d600": (0.300, 0.006, 262), "d500": (0.400, 0.006, 262),
        "l050": (0.978, 0.003, 95), "l100": (0.952, 0.004, 95), "l200": (0.908, 0.005, 95), "l300": (0.852, 0.006, 95),
        "ink": (0.958, 0.004, 95), "ink2": (0.790, 0.005, 262), "ink3": (0.660, 0.006, 262),
        "lt_ink": (0.180, 0.005, 262), "lt_ink2": (0.400, 0.006, 262), "lt_ink3": (0.500, 0.006, 262),
        "lt_rule": (0.850, 0.005, 262), "lt_rule_soft": (0.895, 0.004, 262),
        "acc": (0.880, 0.170, 96), "acc_lo": (0.500, 0.105, 78), "acc_hi": (0.905, 0.150, 100),
        "sig": (0.880, 0.170, 96), "sig_lo": (0.800, 0.160, 92), "sig_hi": (0.920, 0.140, 100),
        "sig_ink": (0.150, 0.006, 262), "sig_ink2": (0.300, 0.030, 85), "sig_ink3": (0.360, 0.040, 85),
        "sig_rule": (0.640, 0.120, 88), "sig_rule_soft": (0.740, 0.140, 92),
        "c2": (0.740, 0.030, 250), "lt_c2": (0.500, 0.060, 250),
        "theme": "#101113", "theme_paper": "#f1f0ec",
    },
    # Moss, linen and a blade of green light.
    "moss": {
        "d950": (0.135, 0.022, 132), "d900": (0.165, 0.026, 132), "d800": (0.198, 0.030, 132),
        "d700": (0.242, 0.032, 132), "d600": (0.312, 0.034, 132), "d500": (0.402, 0.036, 132),
        "l050": (0.972, 0.012, 88), "l100": (0.946, 0.020, 86), "l200": (0.902, 0.026, 84), "l300": (0.842, 0.030, 82),
        "ink": (0.948, 0.020, 95), "ink2": (0.800, 0.030, 118), "ink3": (0.660, 0.032, 124),
        "lt_ink": (0.215, 0.030, 132), "lt_ink2": (0.410, 0.030, 128), "lt_ink3": (0.482, 0.028, 126),
        "lt_rule": (0.840, 0.026, 90), "lt_rule_soft": (0.888, 0.022, 88),
        "acc": (0.860, 0.190, 142), "acc_lo": (0.470, 0.130, 145), "acc_hi": (0.900, 0.170, 140),
        "sig": (0.840, 0.190, 142), "sig_lo": (0.760, 0.180, 143), "sig_hi": (0.890, 0.170, 140),
        "sig_ink": (0.160, 0.040, 140), "sig_ink2": (0.280, 0.060, 140), "sig_ink3": (0.340, 0.070, 140),
        "sig_rule": (0.600, 0.150, 143), "sig_rule_soft": (0.700, 0.170, 143),
        "c2": (0.690, 0.070, 62), "lt_c2": (0.470, 0.070, 58),
        "theme": "#161e14", "theme_paper": "#f2eee2",
    },
    # Midnight blue, a red cape, a little gold.
    "cobalt": {
        "d950": (0.135, 0.040, 262), "d900": (0.165, 0.050, 262), "d800": (0.200, 0.058, 262),
        "d700": (0.248, 0.064, 262), "d600": (0.320, 0.068, 262), "d500": (0.420, 0.070, 262),
        "l050": (0.978, 0.005, 250), "l100": (0.952, 0.010, 250), "l200": (0.908, 0.014, 250), "l300": (0.852, 0.018, 250),
        "ink": (0.958, 0.008, 250), "ink2": (0.810, 0.030, 255), "ink3": (0.680, 0.040, 258),
        "lt_ink": (0.215, 0.058, 262), "lt_ink2": (0.410, 0.050, 262), "lt_ink3": (0.500, 0.045, 262),
        "lt_rule": (0.850, 0.016, 250), "lt_rule_soft": (0.895, 0.012, 250),
        "acc": (0.700, 0.190, 28), "acc_lo": (0.512, 0.200, 27), "acc_hi": (0.860, 0.150, 88),
        "sig": (0.680, 0.200, 29), "sig_lo": (0.620, 0.205, 28), "sig_hi": (0.740, 0.170, 32),
        "sig_ink": (0.110, 0.040, 262), "sig_ink2": (0.165, 0.050, 262), "sig_ink3": (0.205, 0.060, 262),
        "sig_rule": (0.470, 0.150, 28), "sig_rule_soft": (0.560, 0.180, 28),
        "c2": (0.860, 0.150, 88), "lt_c2": (0.560, 0.120, 80),
        "theme": "#0f1628", "theme_paper": "#eff1f5",
    },
}

CHECKS = [
    # label, fg slot, bg slot, minimum
    ("dark body", "ink", "d800", 7.0), ("dark ink-2", "ink2", "d800", 4.5), ("dark ink-3", "ink3", "d800", 4.5),
    ("dark ink-3 on sunk", "ink3", "d900", 4.5), ("dark ink-3 on lift", "ink3", "d700", 4.5),
    ("dark accent text", "acc", "d800", 4.5), ("dark accent on sunk", "acc", "d900", 4.5),
    ("ink on accent (button)", "d950", "acc", 4.5),
    ("paper body", "lt_ink", "l100", 7.0), ("paper ink-2", "lt_ink2", "l100", 4.5),
    ("paper ink-3", "lt_ink3", "l100", 4.5), ("paper ink-3 on sunk", "lt_ink3", "l200", 4.5),
    ("paper accent text", "acc_lo", "l100", 4.5), ("paper accent on sunk", "acc_lo", "l200", 4.5),
    ("signal body", "sig_ink", "sig", 7.0), ("signal ink-2", "sig_ink2", "sig", 4.5), ("signal ink-3", "sig_ink3", "sig", 4.5),
    ("dark rule vs ground (UI 3:1 not required)", "d600", "d800", 1.0),
]

def report():
    bad = 0
    for name, p in PALETTES.items():
        print(f"\n== {name} ==")
        for label, fg, bg, need in CHECKS:
            r = ratio(p[fg], p[bg]); ok = r >= need
            bad += (not ok)
            print(f"  {'ok ' if ok else 'LOW'} {r:5.2f}  (need {need})  {label}")
    print("\nfailures:", bad)
    return bad

def css():
    out = []
    for i, (name, p) in enumerate(PALETTES.items()):
        sel = f':root[data-palette="{name}"]' + (", :root" if i == 0 else "")
        def f(k):
            L, C, h = p[k]; return f"oklch({L:.3f} {C:.3f} {h})"
        out.append(sel + " {")
        for k in ["d950","d900","d800","d700","d600","d500","l050","l100","l200","l300",
                  "ink","ink2","ink3","lt_ink","lt_ink2","lt_ink3","lt_rule","lt_rule_soft",
                  "acc","acc_lo","acc_hi","sig","sig_lo","sig_hi","sig_ink","sig_ink2","sig_ink3",
                  "sig_rule","sig_rule_soft","c2","lt_c2"]:
            out.append(f"  --p-{k.replace('_','-')}: {f(k)};")
        out.append(f"  --p-theme: {p['theme']};")
        out.append(f"  --p-theme-paper: {p['theme_paper']};")
        out.append("}")
    return "\n".join(out)

if __name__ == "__main__":
    if "--css" in sys.argv: print(css())
    elif "--hex" in sys.argv:
        for n, p in PALETTES.items():
            print(n, {k: hexof(v) for k, v in p.items() if isinstance(v, tuple) and k in ("d800","ink","acc","l100","sig")})
    else: sys.exit(1 if report() else 0)
