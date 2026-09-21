#!/usr/bin/env python3
"""Trace the sausage paper's cut edge from its scan, fit it, and draw the figure.

Usage:
    python3 tools/sausage_wave.py            # print the numbers the paper and the page quote
    python3 tools/sausage_wave.py --write    # also rewrite the #wave figure in research/index.html

tools/sausage/scan.jpg is the school-printer scan from the paper (its Figure 8).
The paper is a shade darker than the scanner lid (about 242 against 255), so in
each column the edge is the first run of five rows under 250. Columns where the
crop cuts off the second crest, or a dust speck sits above the edge, are dropped
by a 4-sigma cut. A sine and a triangle wave are fitted with the same freedom:
amplitude, period, position, midline and the scan's own tilt.

The figure is drawn in scan pixels, one to one in both directions, so the wave
on the page has the real paper's proportions. The misfit strip under it is
magnified three times.
"""
import json
import os
import re
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import median_filter
from scipy.optimize import curve_fit
from scipy.signal import sawtooth

HERE = os.path.dirname(os.path.abspath(__file__))
SCAN = os.path.join(HERE, "sausage", "scan.jpg")
PAGE = os.path.join(HERE, "..", "research", "index.html")
K_MINUS_P, R = 2.6, 1.7  # cm, measured on the sausage (paper, Section 5)


def sine(x, A, P, ph, m, s):
    return A * np.cos(2 * np.pi * (x - ph) / P) + m + s * x


def tri(x, A, P, ph, m, s):
    return A * sawtooth(2 * np.pi * (x - ph) / P + np.pi, 0.5) + m + s * x


def trace(im, thr=250, run=5, med=3):
    sm = median_filter(im, size=med) if med > 1 else im
    edge = np.full(im.shape[1], np.nan)
    for c in range(im.shape[1]):
        below = sm[:, c] < thr
        for r in range(im.shape[0] - run):
            if below[r:r + run].all():
                edge[c] = r
                break
    return edge


def fit(edge):
    x = np.arange(len(edge))
    y = -edge
    keep = (edge > 1) & ~np.isnan(edge)  # row 0 is the crop, not the paper
    p = [75, 650, 360, -80, 0]
    for _ in range(4):
        p, _c = curve_fit(sine, x[keep], y[keep], p0=p)
        res = y - sine(x, *p)
        keep &= np.abs(res) < 4 * res[keep].std()
    q, _c = curve_fit(tri, x[keep], y[keep], p0=p)
    return x, y, keep, p, q


def main():
    im = np.asarray(Image.open(SCAN).convert("L")).astype(float)
    edge = trace(im)
    x, y, keep, p, q = fit(edge)
    A, P, ph, m, s = p
    H = 2 * A
    rs, rt = y - sine(x, *p), y - tri(x, *q)
    ratio, pred = H / P, K_MINUS_P / (2 * np.pi * R)
    print("columns used        %d of %d" % (keep.sum(), len(x)))
    print("tilt of the scan    %.2f deg" % np.degrees(np.arctan(s)))
    print("height / period     %.3f  (predicted %.3f, %+.1f%%)" % (ratio, pred, 100 * (ratio / pred - 1)))
    print("sine misfit         %.1f%% of the height" % (100 * rs[keep].std() / H))
    print("triangle misfit     %.1f%% of the height" % (100 * rt[keep].std() / H))
    spread = []
    for thr in (246, 248, 250, 252):
        for run in (3, 5, 8):
            for med in (1, 3):
                _x, _y, _k, pp, _q = fit(trace(im, thr, run, med))
                spread.append(2 * pp[0] / pp[1])
    print("ratio over %d tracing settings: %.3f to %.3f" % (len(spread), min(spread), max(spread)))

    if "--write" not in sys.argv:
        return

    # figure coordinates: trough at 0, tilt removed, crest at y = 10
    TOP, BASE, RC, RK = 10.0, 184.0, 242.0, 3.0
    h = y - s * x - (m - A)
    Y = lambda v: TOP + (H - v)
    f1 = lambda v: "%.1f" % v
    fs = lambda xx: sine(xx, A, P, ph, A, 0)
    ft = lambda xx: tri(xx, q[0], q[1], q[2], q[3] - (m - A), q[4] - s)

    segs, seg = [], []
    for c in range(len(x)):
        if keep[c]:
            seg.append((x[c], Y(h[c])))
        elif seg:
            segs.append(seg)
            seg = []
    if seg:
        segs.append(seg)
    thin = lambda sg: sg[::3] + ([sg[-1]] if (len(sg) - 1) % 3 else [])
    edge_d = " ".join("M" + " L".join(f1(a) + " " + f1(b) for a, b in thin(sg)) for sg in segs)
    pts = [(x[c], Y(h[c])) for c in range(len(x)) if keep[c]][::3]
    paper_d = "M0 %s L%s L%d %s Z" % (f1(BASE), " L".join(f1(a) + " " + f1(b) for a, b in pts), len(x), f1(BASE))

    xs = np.append(np.arange(0, len(x), 6.0), float(len(x) - 1))
    kc = np.array([c for c in range(len(x)) if keep[c]])[::3]
    data = {
        "x": [round(float(v), 1) for v in xs],
        "s": [round(Y(v), 1) for v in fs(xs)],
        "t": [round(Y(v), 1) for v in ft(xs)],
        "rx": [int(c) for c in kc],
        "rs": [round(RC - RK * (h[c] - fs(c)), 1) for c in kc],
        "rt": [round(RC - RK * (h[c] - ft(c)), 1) for c in kc],
    }

    def line(xx, yy, gap=None):
        out, prev = [], None
        for a, b in zip(xx, yy):
            out.append(("M" if prev is None or (gap and a - prev > gap) else "L") + f1(a) + " " + f1(b))
            prev = a
        return " ".join(out)

    page = open(PAGE, encoding="utf-8").read()
    for cls, d in (("wave__paper", paper_d), ("wave__edge", edge_d),
                   ("wave__fit", line(data["x"], data["s"])), ("wave__miss", line(data["rx"], data["rs"], 12))):
        page, n = re.subn(r'(<path class="%s" d=")[^"]*(")' % cls, lambda mo: mo.group(1) + d + mo.group(2), page)
        assert n == 1, cls
    page, n = re.subn(r'(<script type="application/json" id="waveData">)[^<]*(</script>)',
                      lambda mo: mo.group(1) + json.dumps(data, separators=(",", ":")) + mo.group(2), page)
    assert n == 1
    open(PAGE, "w", encoding="utf-8").write(page)
    print("wrote the #wave figure in research/index.html")


if __name__ == "__main__":
    main()
