/* Figures for /work/clipwell/.

   Two schematics, pre-rendered into the page by tools/figures.mjs:
   - cwTwice: "written twice". Two columns, macOS and Windows, on one shared
     line; each station on the line (the same bar, the same cards, the same
     keys, the same history format) is drawn once and placed on both sides,
     so the two columns are identical by construction.
   - cwPassWide / cwPassNarrow: four things copied in turn; the one a password
     manager marks concealed goes past the history instead of into it.
   Kinds and their order follow the recording on the page (text, link, image,
   text, file, text). Nothing here is a measurement. */
(function (root) {
  "use strict";

  function f(n) { return String(Math.round(n * 100) / 100); }
  function rect(c, x, y, w, h, rx, extra) {
    return '<rect class="' + c + '" x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '"' + (rx ? ' rx="' + f(rx) + '"' : "") + (extra || "") + "/>";
  }
  function line(c, x1, y1, x2, y2) {
    return '<line class="' + c + '" x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '"/>';
  }
  function path(c, d) { return '<path class="' + c + '" d="' + d + '"/>'; }
  function text(c, x, y, s, extra) { return '<text class="' + c + '" x="' + f(x) + '" y="' + f(y) + '"' + (extra || "") + ">" + s + "</text>"; }
  function svg(c, w, h, body) {
    return '<svg class="' + c + '" viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '" focusable="false" aria-hidden="true">' + body + "</svg>";
  }

  /* ------------------------------------------------------------ what a card shows */
  function glyph(kind, bx, by, bw, bh) {
    var s = "", cx = bx + bw / 2, cy = by + bh / 2, p, i;
    if (kind === "Text") {
      var n = bh > 44 ? 4 : 3, L = [0.9, 1, 0.74, 0.48], gap = Math.min(10, bh / (n + 1.4));
      p = bw * 0.13;
      var y0 = cy - gap * (n - 1) / 2;
      for (i = 0; i < n; i++) s += line("cw-gl", bx + p, y0 + i * gap, bx + p + (bw - 2 * p) * L[i], y0 + i * gap);
    } else if (kind === "Link") {
      var lw = bw * 0.34, lh = Math.max(5, bw * 0.13);
      s += '<g transform="rotate(-38 ' + f(cx) + " " + f(cy) + ')">' +
        rect("cw-gl", cx - lw * 0.82, cy - lh / 2, lw, lh, lh / 2) +
        rect("cw-gl", cx - lw * 0.18, cy - lh / 2, lw, lh, lh / 2) + "</g>";
    } else if (kind === "Image") {
      p = bw * 0.13;
      var fw = bw - 2 * p, fh = Math.min(bh * 0.7, fw * 0.66), fx = bx + p, fy = cy - fh / 2;
      s += rect("cw-gl", fx, fy, fw, fh, 1.5);
      s += path("cw-gf", "M" + f(fx) + "," + f(fy + fh) + " L" + f(fx + fw * 0.34) + "," + f(fy + fh * 0.42) + " L" + f(fx + fw * 0.54) + "," + f(fy + fh * 0.72) + " L" + f(fx + fw * 0.7) + "," + f(fy + fh * 0.52) + " L" + f(fx + fw) + "," + f(fy + fh) + " Z");
      s += '<circle class="cw-gf" cx="' + f(fx + fw * 0.76) + '" cy="' + f(fy + fh * 0.28) + '" r="' + f(Math.max(1.4, fh * 0.1)) + '"/>';
    } else if (kind === "File") {
      var pw = Math.min(bw * 0.32, bh * 0.52), ph = pw * 1.3, px = cx - pw / 2, py = cy - ph / 2, e = pw * 0.32;
      s += path("cw-gl is-page", "M" + f(px) + "," + f(py) + " H" + f(px + pw - e) + " L" + f(px + pw) + "," + f(py + e) + " V" + f(py + ph) + " H" + f(px) + " Z");
      s += path("cw-gl", "M" + f(px + pw - e) + "," + f(py) + " V" + f(py + e) + " H" + f(px + pw));
      if (pw > 14) {
        s += line("cw-gl is-thin", px + pw * 0.22, py + ph * 0.56, px + pw * 0.78, py + ph * 0.56);
        s += line("cw-gl is-thin", px + pw * 0.22, py + ph * 0.74, px + pw * 0.62, py + ph * 0.74);
      }
    } else if (kind === "Concealed") {
      var dots = 6, dr = Math.max(1.6, bw * 0.034), dg = dr * 3.2, dx0 = cx - dg * (dots - 1) / 2;
      for (i = 0; i < dots; i++) s += '<circle class="cw-dot" cx="' + f(dx0 + i * dg) + '" cy="' + f(cy) + '" r="' + f(dr) + '"/>';
    }
    return s;
  }

  /* a card: a header band that names the kind (in the kind's own colour, as
     the app draws it), a body that shows it */
  function card(x, y, w, h, kind, o) {
    o = o || {};
    var hd = o.hd || 12, r = o.r || 3, s = "";
    s += rect("cw-cb" + (o.ghost ? " is-ghost" : ""), x, y, w, h, r);
    if (!o.ghost) s += path("cw-ch k-" + kind.toLowerCase(), "M" + f(x) + "," + f(y + hd) + " V" + f(y + r) + " Q" + f(x) + "," + f(y) + " " + f(x + r) + "," + f(y) + " H" + f(x + w - r) + " Q" + f(x + w) + "," + f(y) + " " + f(x + w) + "," + f(y + r) + " V" + f(y + hd) + " Z");
    else s += line("cw-co is-ghost", x, y + hd, x + w, y + hd);
    if (o.label) s += text("cw-ck", x + 7, y + hd * 0.7, kind);
    var foot = o.foot ? 14 : 0;
    s += glyph(kind, x, y + hd, w, h - hd - foot);
    if (o.foot) s += line("cw-cf", x + 7, y + h - 8, x + w * 0.4, y + h - 8);
    s += rect("cw-co" + (o.ghost ? " is-ghost" : ""), x, y, w, h, r);
    return s;
  }

  /* ------------------------------------------------------------ cwTwice: the four stations */
  var BAR = ["Text", "Link", "Image", "Text", "File", "Text"];
  var LEN = [0.44, 0.56, 0.26, 0.9, 0.36, 0.43];     // how long each item's content runs, as a share of the row
  var STEP = 65;

  function bar() {
    var W = 400, H = 86, s = "";
    s += rect("cw-panel", 0.75, 0.75, W - 1.5, H - 1.5, 10);
    s += rect("cw-pill", 168, 6, 64, 10, 5);
    s += '<circle class="cw-gl is-thin" cx="176" cy="11" r="2.2"/>';
    BAR.forEach(function (k, i) { s += card(8 + i * STEP, 22, 59, 56, k, { hd: 11, r: 4.5, foot: true }); });
    s += '<g class="tw-sel">' + rect("cw-sel", 4.5, 18.5, 66, 63, 7.5) + "</g>";
    return svg("tw-svg is-bar", W, H, s);
  }

  var KINDS = ["Text", "Link", "Image", "File"];
  function cardsWide() {
    var s = "";
    KINDS.forEach(function (k, i) { s += card(1 + i * 104, 1, 86, 110, k, { hd: 22, r: 7, label: true, foot: true }); });
    return svg("tw-svg v-w", 400, 112, s);
  }
  function cardsNarrow() {
    var s = "";
    KINDS.forEach(function (k, i) { s += card(1 + (i % 2) * 94, 1 + Math.floor(i / 2) * 106, 84, 98, k, { hd: 22, r: 7, label: true, foot: true }); });
    return svg("tw-svg v-n", 180, 206, s);
  }

  function history(W, x0, x1, top, rh, xi, xk, xl, wl, size) {
    var H = top + BAR.length * rh + 10, e = size === "n" ? 13 : 18, s = "";
    s += path("cw-page", "M" + x0 + ",1 H" + (x1 - e) + " L" + x1 + "," + (1 + e) + " V" + (H - 1) + " H" + x0 + " Z");
    s += path("cw-fold", "M" + (x1 - e) + ",1 V" + (1 + e) + " H" + x1);
    s += '<g class="tw-hl" style="--rh:' + rh + '">' + rect("cw-hl", x0 + 7, top, x1 - x0 - 14, rh) + rect("cw-hlb", x0 + 7, top, 3, rh) + "</g>";
    BAR.forEach(function (k, i) {
      var y = top + i * rh;
      s += text("cw-hi", xi, y + rh * 0.68, String(i + 1));
      s += text("cw-hk", xk, y + rh * 0.68, k);
      s += line("cw-hc", xl, y + rh * 0.5, xl + wl * LEN[i], y + rh * 0.5);
    });
    return svg("tw-svg is-hist v-" + size, W, H, s);
  }
  function histWide() { return history(400, 44, 356, 16, 22, 62, 78, 134, 196, "w"); }
  function histNarrow() { return history(180, 1, 179, 14, 23, 12, 26, 70, 96, "n"); }

  var ARROW_R = '<svg viewBox="0 0 18 12" width="18" height="12" focusable="false" aria-hidden="true"><path d="M1 6h15.5M11 1l5 5-5 5"/></svg>';
  var ARROW_L = '<svg viewBox="0 0 18 12" width="18" height="12" focusable="false" aria-hidden="true"><path d="M17 6H1.5M7 1L2 6l5 5"/></svg>';
  function keys() {
    return '<kbd class="tw-key" data-k="-1">' + ARROW_L + '<span class="sr">Left arrow</span></kbd>' +
      '<kbd class="tw-key" data-k="1">' + ARROW_R + '<span class="sr">Right arrow</span></kbd>';
  }

  function twice() {
    var rows = [
      { k: "bar", d: bar() },
      { k: "cards", d: cardsWide() + cardsNarrow() },
      { k: "keys", d: keys(), cls: " tw-keys" },
      { k: "history format", d: histWide() + histNarrow() }
    ];
    var s = '<div class="tw-heads" aria-hidden="true"><p class="tw-h is-mac"><span>macOS</span></p><p class="tw-h is-win"><span>Windows</span></p></div>';
    rows.forEach(function (r, i) {
      s += '<div class="tw-row" style="--r:' + i + '">' +
        '<p class="tw-st"><span>the same</span> ' + r.k + "</p>" +
        '<div class="tw-d is-mac' + (r.cls || "") + '">' + r.d + "</div>" +
        '<div class="tw-d is-win' + (r.cls || "") + '">' + r.d + "</div></div>";
    });
    return s;
  }

  /* ------------------------------------------------------------ cwPass: past the history */
  function pass(G) {
    var s = "", cw = G.cw, ch = G.ch, yT = G.yT, hd = G.hd;
    // where things come from
    s += rect("pw-board", G.bx, G.by, G.bw, G.bh, 5);
    s += rect("pw-bclip", G.bx + G.bw * 0.26, G.by - 5, G.bw * 0.48, 9, 2);
    for (var i = 0; i < 3; i++) s += line("pw-bl", G.bx + G.bw * 0.22, G.by + 14 + i * 8, G.bx + G.bw * (i === 2 ? 0.56 : 0.78), G.by + 14 + i * 8);
    s += text("pw-lab is-mid", G.bx + G.bw / 2, G.by + G.bh + 20, "copied");
    // the track, the branch into the history, the stop past it
    s += line("pw-track", G.x0, yT, G.xE, yT);
    s += path("pw-chev", "M" + (G.chev[0] - 4) + "," + (yT - 5) + " L" + (G.chev[0] + 2) + "," + yT + " L" + (G.chev[0] - 4) + "," + (yT + 5));
    s += path("pw-chev", "M" + (G.chev[1] - 4) + "," + (yT - 5) + " L" + (G.chev[1] + 2) + "," + yT + " L" + (G.chev[1] - 4) + "," + (yT + 5));
    s += path("pw-branch", "M" + (G.xJ - 12) + "," + yT + " Q" + G.xJ + "," + yT + " " + G.xJ + "," + (yT + 12) + " V" + (G.py - 6));
    s += path("pw-chev", "M" + (G.xJ - 5) + "," + (G.py - 11) + " L" + G.xJ + "," + (G.py - 5) + " L" + (G.xJ + 5) + "," + (G.py - 11));
    s += line("pw-stop", G.xE + 3, yT - 14, G.xE + 3, yT + 14);
    // the history, on disk
    var px0 = G.xJ - G.pw / 2, px1 = G.xJ + G.pw / 2, e = 13;
    s += path("pw-page", "M" + px0 + "," + G.py + " H" + (px1 - e) + " L" + px1 + "," + (G.py + e) + " V" + (G.py + G.ph) + " H" + px0 + " Z");
    s += path("pw-fold", "M" + (px1 - e) + "," + G.py + " V" + (G.py + e) + " H" + px1);
    ["Text", "Link", "Image"].forEach(function (k, j) {
      var y = G.py + 14 + j * G.rh;
      s += '<g class="pw-rec" style="--t:' + G.recT[j] + 'ms">' + text("pw-rk", px0 + 12, y + 14, k) + line("pw-rl", px0 + G.rl, y + 9.5, px0 + G.rl + G.rlw[j], y + 9.5) + "</g>";
    });
    s += line("pw-rl is-empty", px0 + 12, G.py + 14 + 3 * G.rh + 9.5, px1 - 16, G.py + 14 + 3 * G.rh + 9.5);
    s += text("pw-lab" + (G.histMid ? " is-mid" : ""), G.histLab[0], G.histLab[1], "the history, on disk");
    // the one that went past
    var gx = G.xE - 4 - cw, gy = yT - ch / 2;
    s += '<g class="pw-ghost">' + card(gx, gy, cw, ch, "Concealed", { hd: hd, r: 5, ghost: true }) + "</g>";
    s += '<g class="pw-end">' + text("pw-lab is-end", G.xE + 3, G.lab1, "marked concealed or transient") +
      text("pw-lab is-end", G.xE + 3, G.lab1 + 15, "by a password manager") +
      text("pw-say is-end", G.xE + 3, yT + 38, "never written to disk") + "</g>";
    // what moves: four copies, in turn
    var sx = G.x0 + 2, sy = yT - ch / 2;
    [["Text", 0], ["Link", 1], ["Concealed", 2], ["Image", 3]].forEach(function (c) {
      var by = c[0] === "Concealed";
      var dx = by ? gx - sx : G.xJ - cw / 2 - sx, dy = G.py + G.ph * 0.45 - yT;
      s += '<g class="pw-mv' + (by ? " is-by" : "") + '" style="--dx:' + f(dx) + "px;--dy:" + f(dy) + "px;--t:" + G.mvT[c[1]] + 'ms">' +
        card(sx, sy, cw, ch, c[0], { hd: hd, r: 5 }) + "</g>";
    });
    return svg("pw-svg", G.W, G.H, s);
  }
  var PASS_T = { mv: [300, 1000, 1700, 2900], rec: [1830, 2530, 4430] };
  function passWide() {
    return pass({ W: 720, H: 248, x0: 56, xE: 660, yT: 62, xJ: 330, chev: [212, 520], cw: 60, ch: 40, hd: 11,
      bx: 8, by: 40, bw: 32, bh: 44, py: 132, pw: 168, ph: 112, rh: 21, rl: 54, rlw: [62, 78, 40],
      histLab: [424, 160], lab1: 17, mvT: PASS_T.mv, recT: PASS_T.rec });
  }
  function passNarrow() {
    return pass({ W: 358, H: 286, x0: 36, xE: 340, yT: 64, xJ: 150, chev: [104, 250], cw: 48, ch: 34, hd: 9,
      bx: 4, by: 46, bw: 24, bh: 34, py: 128, pw: 132, ph: 112, rh: 21, rl: 50, rlw: [42, 54, 28],
      histLab: [150, 266], histMid: true, lab1: 16, mvT: PASS_T.mv, recT: PASS_T.rec });
  }

  var api = {
    twice: twice, passWide: passWide, passNarrow: passNarrow,
    markers: function () {
      return { cwTwice: twice, cwPassWide: passWide, cwPassNarrow: passNarrow };
    }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FigCW = api;
})(typeof window !== "undefined" ? window : this);
