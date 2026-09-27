/* Gluline: figures for the case page.

   1. The timeline. A schematic of dates, not a chart of activity: from the
      oldest files (the start of April 2026, drawn from 1 April) to the App
      Store release on 19 August 2026, as one filled track graduated in
      weeks, ending on a knob at the release. The two audits the case
      mentions are placed by month only, because that is all the record
      says. Google Play came after the App Store on an undated stretch,
      drawn as dots. Horizontal positions are fractions of the width, so the
      ticks keep their places at any width and the type keeps its own size.

   2. The count strips: the 74 candidates of August's audit (42 confirmed,
      32 refuted) and the 15 fields the minification check covers.

   Pre-rendered into work/gluline/index.html by tools/figures.mjs;
   assets/js/gluline.js animates the timeline and the strips in the browser. */
(function (root) {
  "use strict";

  var DAY = 864e5;
  var T0 = Date.UTC(2026, 3, 1), T1 = Date.UTC(2026, 7, 19);
  var DAYS = Math.round((T1 - T0) / DAY);                 // 140
  var MONTHS = [["April", 3], ["May", 4], ["June", 5], ["July", 6], ["August", 7]]
    .map(function (m) { return { name: m[0], d: Math.round((Date.UTC(2026, m[1], 1) - T0) / DAY) }; });
  var AUG = MONTHS[4].d;                                    // 122

  function pc(f) { return (Math.round(f * 1e5) / 1e3) + "%"; }
  function L(x1, y1, x2, y2, cls, extra) {
    return '<line class="' + cls + '" x1="' + x1 + '" x2="' + x2 + '" y1="' + y1 + '" y2="' + y2 + '"' + (extra || "") + "/>";
  }
  function T(x, y, s, cls, extra) { return '<text class="' + cls + '" x="' + x + '" y="' + y + '"' + (extra || "") + ">" + s + "</text>"; }

  /* the readout while the track fills, in half months; at rest it reads the same as at the end */
  function halfMonths(days) {
    var h = Math.floor(days / (365.25 / 24) + 1e-9);
    if (h < 1) return "";
    var whole = Math.floor(h / 2), half = h % 2 ? "½" : "";
    if (!whole) return "½ month";
    return whole + half + (whole === 1 && !half ? " month" : " months");
  }
  var AT_REST = halfMonths(DAYS);                           // "4½ months"

  function ruler(wide) {
    var sfx = wide ? "-w" : "-n";
    var xE = wide ? 0.86 : 0.78;
    function X(d) { return d / DAYS * xE; }
    var A = wide ? 58 : 74;               // the track's centre line
    var TH = 10;                          // the track's thickness
    var tk = A + TH / 2 + 7;              // where the graduation starts
    var yMo = tk + (wide ? 30 : 26);      // month names
    var y1 = yMo + (wide ? 34 : 32);      // the end labels
    var H = y1 + 22;
    var s = '<svg class="gr-svg" width="100%" height="' + H + '" overflow="visible" role="img" aria-labelledby="gr-t' + sfx + ' gr-d' + sfx + '" data-xe="' + xE + '" data-days="' + DAYS + '">' +
      '<title id="gr-t' + sfx + '">From the oldest files to the App Store, a schematic of the dates</title>' +
      '<desc id="gr-d' + sfx + '">A timeline from the start of April 2026, where the oldest files date from, to 19 August 2026, when Gluline went live on the App Store: four and a half months, graduated in weeks. An audit in April raised about 58 findings; an audit in August, before release, raised 74 candidates. Google Play followed the App Store.</desc>';

    // the audits, by month: a short bar over the month, and its label above it
    var au = [
      { d0: 0, d1: MONTHS[1].d, label: "April’s audit, about 58 findings", y: wide ? 30 : 22, anchor: "start" },
      { d0: AUG, d1: DAYS, label: "August’s audit, 74 candidates", y: wide ? 30 : 48, anchor: "end" }
    ];
    au.forEach(function (a, i) {
      var xa = X(a.d0), xb = X(a.d1);
      s += '<g class="gr-au" data-gr-au data-d="' + a.d0 + '" style="--i:' + i + '">' +
        '<rect class="gr-au-b" x="' + pc(xa) + '" width="' + pc(xb - xa) + '" y="' + a.y + '" height="4" rx="2"/>' +
        T(pc(a.anchor === "end" ? xb : xa), a.y - 9, a.label, "gr-au-t", a.anchor === "end" ? ' text-anchor="end"' : "") +
        "</g>";
    });

    // graduation under the track: weeks, and the first day of each month
    var ticks = "", n = 0;
    for (var d = 1; d < DAYS; d++) {
      var isM = MONTHS.some(function (m) { return m.d === d; }), isW = d % 7 === 0;
      if (!isM && !isW) continue;
      ticks += L(pc(X(d)), tk, pc(X(d)), tk + (isM ? 12 : 5), isM ? "gr-t gr-m" : "gr-t gr-w", ' style="--i:' + (n++) + '"');
    }
    s += '<g class="gr-ticks">' + ticks + "</g>";
    // month names: at the month's first day on a wide page; centred in the month, shortened, on a phone
    MONTHS.forEach(function (m, i) {
      if (wide) s += T(pc(X(m.d)), yMo, m.name, "gr-mo", m.d === 0 ? "" : ' dx="-0.5"');
      else s += T(pc(X((m.d + (i < 4 ? MONTHS[i + 1].d : DAYS)) / 2)), yMo, m.name.slice(0, 3), "gr-mo", ' text-anchor="middle"');
    });

    // the track: dated to the release, then undated dots to Google Play
    s += '<rect class="gr-bed" x="0" y="' + (A - TH / 2) + '" width="' + pc(xE) + '" height="' + TH + '" rx="' + TH / 2 + '"/>';
    s += '<line class="gr-dots" x1="' + pc(xE) + '" x2="100%" y1="' + A + '" y2="' + A + '" data-gr-dots/>';
    s += '<rect class="gr-fill" x="0" y="' + (A - TH / 2) + '" width="' + pc(xE) + '" height="' + TH + '" rx="' + TH / 2 + '" data-gr-fill/>';
    s += '<circle class="gr-knob" cx="' + pc(xE) + '" cy="' + A + '" r="9" data-gr-knob/>';

    // the two ends
    s += T("0%", y1, "The oldest files", "gr-lab") + T("0%", y1 + 18, "start of April 2026", "gr-sub");
    s += '<g class="gr-endl" data-gr-endl>' + (wide
      ? T(pc(xE), y1, "19 August 2026", "gr-lab", ' text-anchor="end"') +
        T(pc(xE), y1 + 18, "live on the App Store", "gr-sub", ' text-anchor="end"') +
        T("100%", A - 14, "then Google Play", "gr-sub is-then", ' text-anchor="end"')
      : T("100%", y1, "19 August 2026", "gr-lab", ' text-anchor="end"') +
        T("100%", y1 + 18, "the App Store, then Google Play", "gr-sub", ' text-anchor="end"')) +
      "</g>";
    return s + "</svg>";
  }

  /* 74 candidates, one cell each, sorted: 42 confirmed, then 32 refuted */
  function auditCells() {
    var s = "";
    for (var i = 0; i < 74; i++) s += '<i class="' + (i < 42 ? "is-y" : "is-n") + '" style="--i:' + i + '"></i>';
    return s;
  }
  function fieldMarks() {
    var s = "";
    for (var i = 0; i < 15; i++) s += '<i style="--i:' + i + '"></i>';
    return s;
  }

  var api = {
    DAYS: DAYS, halfMonths: halfMonths, AT_REST: AT_REST, ruler: ruler,
    markers: function () {
      return {
        glRulerWide: function () { return ruler(true); },
        glRulerNarrow: function () { return ruler(false); },
        glAuditCells: auditCells,
        glFields: fieldMarks
      };
    }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GlFig = api;
})(this);
