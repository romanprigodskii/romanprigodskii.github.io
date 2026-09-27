/* Gluline: figures for the case page.

   1. The time ruler. A schematic of dates, not a chart of activity: from the
      oldest files (the start of April 2026, drawn from 1 April) to the App
      Store release on 19 August 2026, graduated in days and weeks, with a
      dimension line over it that reads "four and a half months". The two
      audits the case mentions are placed by month only, because that is all
      the record says. Google Play came after the App Store on an undated
      stretch of axis, drawn dashed. Horizontal positions are fractions of the
      width, so the ticks keep their places at any width and the type keeps
      its own size.

   2. The count strips: the 74 candidates of August's audit (42 confirmed,
      32 refuted) and the 15 fields the minification check covers.

   Pre-rendered into work/gluline/index.html by tools/figures.mjs;
   assets/js/gluline.js animates the ruler and the strips in the browser. */
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

  /* the readout while the dimension line opens, in half months; the words at rest */
  function halfMonths(days) {
    var h = Math.floor(days / (365.25 / 24) + 1e-9);
    if (h < 1) return "";
    var whole = Math.floor(h / 2), half = h % 2 ? "½" : "";
    if (!whole) return "½ month";
    return whole + half + (whole === 1 && !half ? " month" : " months");
  }
  var AT_REST = "four and a half months";

  function ruler(wide) {
    var sfx = wide ? "-w" : "-n";
    var xE = wide ? 0.86 : 0.78;
    function X(d) { return d / DAYS * xE; }
    var D = wide ? 46 : 40;               // the dimension line
    var A = wide ? 104 : 112;             // the axis
    var y1 = A + (wide ? 76 : 68);        // annotation rows under the axis
    var H = y1 + 26;
    var s = '<svg class="gr-svg" width="100%" height="' + H + '" overflow="visible" role="img" aria-labelledby="gr-t' + sfx + ' gr-d' + sfx + '" data-xe="' + xE + '" data-days="' + DAYS + '">' +
      '<title id="gr-t' + sfx + '">From the oldest files to the App Store, a schematic of the dates</title>' +
      '<desc id="gr-d' + sfx + '">A calendar ruler from the start of April 2026, where the oldest files date from, to 19 August 2026, when Gluline went live on the App Store: four and a half months, graduated in weeks. An audit in April raised about 58 findings; an audit in August, before release, raised 74 candidates. Google Play followed the App Store.</desc>';

    // the audits, by month: a bracket over the month, and its label
    var au = [
      { d0: 0, d1: MONTHS[1].d, label: "April’s audit, about 58 findings", yb: wide ? A - 16 : A - 40, anchor: "start" },
      { d0: AUG, d1: DAYS, label: "August’s audit, 74 candidates", yb: A - 16, anchor: "end" }
    ];
    au.forEach(function (a, i) {
      var xa = pc(X(a.d0)), xb = pc(X(a.d1));
      s += '<g class="gr-au" data-gr-au data-d="' + a.d0 + '" style="--i:' + i + '">' +
        L(xa, a.yb, xb, a.yb, "gr-br") + L(xa, a.yb - 5, xa, a.yb + 5, "gr-br") + L(xb, a.yb - 5, xb, a.yb + 5, "gr-br") +
        T(a.anchor === "end" ? xb : xa, a.yb - 10, a.label, "gr-au-t", a.anchor === "end" ? ' text-anchor="end" dx="-2"' : ' dx="' + (i === 0 ? 6 : 2) + '"') +
        "</g>";
    });

    // graduation: days (wide only), weeks, month starts
    var ticks = "", n = 0;
    for (var d = 0; d <= DAYS; d++) {
      var isM = MONTHS.some(function (m) { return m.d === d; }), isW = d % 7 === 0;
      if (!isM && !isW && !wide) continue;
      var len = isM ? (wide ? 24 : 20) : isW ? (wide ? 12 : 10) : 5;
      var cls = isM ? "gr-t gr-m" : isW ? "gr-t gr-w" : "gr-t gr-d";
      if (d === DAYS) continue;          // the release draws its own line
      ticks += L(pc(X(d)), A, pc(X(d)), A + len, cls, ' style="--i:' + (n++) + '"');
    }
    s += '<g class="gr-ticks">' + ticks + "</g>";
    // month names: at the month's first day on a wide page; centred in the month, shortened, on a phone
    MONTHS.forEach(function (m, i) {
      if (wide) s += T(pc(X(m.d)), A + 42, m.name, "gr-mo", ' dx="' + (m.d === 0 ? 7 : 5) + '"');
      else s += T(pc(X((m.d + (i < 4 ? MONTHS[i + 1].d : DAYS)) / 2)), A + 36, m.name.slice(0, 3), "gr-mo", ' text-anchor="middle"');
    });

    // the axis: dated to the release, undated after it
    s += L("0%", A, pc(xE), A, "gr-ax");
    s += L(pc(xE), A, "100%", A, "gr-dash", " data-gr-dash");

    // the start and the release, carried down to their labels
    s += L("0%", D - 14, "0%", y1 + 18, "gr-ext");
    s += '<g class="gr-endg" data-gr-endg>' + L(pc(xE), A, pc(xE), y1 + 18, "gr-end") + "</g>";
    s += T("0%", y1 + 2, "The oldest files", "gr-lab", ' dx="8"') + T("0%", y1 + 19, "start of April 2026", "gr-sub", ' dx="8"');
    s += '<g class="gr-endl" data-gr-endl>' +
      T(pc(xE), y1 + 2, "19 August 2026", "gr-lab", ' dx="-8" text-anchor="end"') +
      T(pc(xE), y1 + 19, wide ? "live on the App Store" : "the App Store", "gr-sub", ' dx="-8" text-anchor="end"') +
      (wide ? T(pc(xE), y1 + 2, "then Google Play", "gr-sub is-then", ' dx="8"')
            : T(pc(xE), y1 + 2, "then", "gr-sub is-then", ' dx="7"') + T(pc(xE), y1 + 19, "Google Play", "gr-sub is-then", ' dx="7"')) +
      "</g>";

    // the dimension line, arrowed at both ends, and what it reads
    s += L(pc(xE), D - 14, pc(xE), A, "gr-ext", " data-gr-ext");
    s += L("0%", D, pc(xE), D, "gr-dim", " data-gr-dim");
    s += '<svg x="0%" y="' + D + '" overflow="visible"><path class="gr-arr" d="M0.5 0 L10 -4 L10 4 Z"/></svg>';
    s += '<svg x="' + pc(xE) + '" y="' + D + '" overflow="visible" data-gr-arr><path class="gr-arr" d="M-0.5 0 L-10 -4 L-10 4 Z"/></svg>';
    s += T(pc(xE / 2), D - 11, AT_REST, "gr-read", ' text-anchor="middle" data-gr-read');
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
