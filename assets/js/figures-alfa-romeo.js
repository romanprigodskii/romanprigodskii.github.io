/* Alfa-Romeo: the copilot's limits, on a rouble scale.

   A logarithmic scale of roubles from 100 to 2,000,000. Two rules from the
   project, and nothing else, are drawn on it:
     100,000  the largest action the copilot may carry out, after a yes
     500,000  a business payment over this waits for a second signature

   Loaded by tools/figures.mjs (node) through markers(), which pre-renders the
   SVG into the page; in the browser the same file hands the page script the
   scale (fx, rAt, stops), so the cursor reads the drawing it moves over. */
(function (root) {
  "use strict";

  var COPILOT = 100000, SECOND = 500000, LO = 100, HI = 2000000;
  var L0 = Math.log(LO), SPAN = Math.log(HI) - L0;

  /* amount -> fraction of the width, and back */
  function fx(r) { return (Math.log(r) - L0) / SPAN; }
  function rAt(f) { return Math.exp(L0 + f * SPAN); }
  function pc(f) { return +(f * 100).toFixed(3) + "%"; }
  function fmt(r) { return String(Math.round(r)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

  /* the detents: 1 to 9 x 10^k, from 100 roubles to 2,000,000 */
  function stops() {
    var s = [];
    for (var k = 2; k <= 6; k++) for (var m = 1; m <= 9; m++) { var v = m * Math.pow(10, k); if (v <= HI) s.push(v); }
    return s;
  }

  function build(wide) {
    var x1 = pc(fx(COPILOT)), x2 = pc(fx(SECOND)), k = wide ? "w" : "n";
    var L = wide
      ? { top: 40, t1: 64, s1: 84, l1: 112, b1: 126, t2: 170, s2: 190, l2: 218, b2: 232, ax: 264, H: 300 }
      : { top: 40, t1: 60, s1: 77, l1: 102, b1: 114, t2: 150, s2: 167, l2: 192, b2: 204, ax: 232, H: 264 };
    var n = wide ? "" : " is-n";
    var s = '<svg class="ar-sc-svg' + n + '" width="100%" height="' + L.H + '" data-ax="' + L.ax + '" role="img" aria-labelledby="ar-sc-t' + k + ' ar-sc-d' + k + '">' +
      '<title id="ar-sc-t' + k + '">What the copilot may carry out, and when a business payment waits for a second signature, by amount</title>' +
      '<desc id="ar-sc-d' + k + '">A logarithmic scale of roubles from 100 to 2,000,000. The copilot drafts an action and carries it out after a yes, up to 100,000 roubles, the largest action it may carry out. A business payment over 500,000 roubles waits for a second signature.</desc>';

    /* one hairline per decade */
    s += '<g class="ar-sc-g">';
    [100, 1000, 10000, 100000, 1000000].forEach(function (v, i) {
      if (v === COPILOT) return;
      s += '<line class="ar-g" style="--i:' + i + '" x1="' + pc(fx(v)) + '" x2="' + pc(fx(v)) + '" y1="' + L.top + '" y2="' + L.ax + '"/>';
    });
    s += "</g>";

    /* the two rules */
    s += '<line class="ar-rule" x1="' + x1 + '" x2="' + x1 + '" y1="' + L.top + '" y2="' + (L.ax + 10) + '"/>';
    s += '<line class="ar-rule" x1="' + x2 + '" x2="' + x2 + '" y1="' + L.top + '" y2="' + (L.ax + 10) + '"/>';

    /* lane titles */
    s += '<text class="ar-lt' + n + '" x="0" y="' + L.t1 + '">The copilot</text>';
    s += '<text class="ar-ls' + n + '" x="0" y="' + L.s1 + '">drafts the action and waits for a yes</text>';
    s += '<text class="ar-lt' + n + '" x="0" y="' + L.t2 + '">A business payment</text>';
    s += '<text class="ar-ls' + n + '" x="0" y="' + L.s2 + '">in Romeo Business</text>';

    /* the lanes, revealed up to the cursor as it sweeps */
    s += '<defs><clipPath id="ar-clip-' + k + '"><rect class="ar-clip" x="0" y="0" width="100%" height="' + L.H + '"/></clipPath></defs>';
    s += '<g class="ar-lanes" clip-path="url(#ar-clip-' + k + ')">';
    // lane 1: carried out after a yes up to 100,000; past it, an empty track
    s += '<rect class="ar-track" x="0" y="' + (L.b1 - 4) + '" width="100%" height="8" rx="4"/>';
    s += '<rect class="ar-bar" x="0" y="' + (L.b1 - 4) + '" width="' + x1 + '" height="8" rx="4"/>';
    // lane 2: one line, one signature, up to 500,000; past it the line splits in two
    s += '<rect class="ar-one" x="0" y="' + (L.b2 - 1.5) + '" width="' + x2 + '" height="3" rx="1.5"/>';
    var w2 = pc(1 - fx(SECOND));
    s += '<rect class="ar-two" x="' + x2 + '" y="' + (L.b2 - 4) + '" width="' + w2 + '" height="3" rx="1.5"/>';
    s += '<rect class="ar-two" x="' + x2 + '" y="' + (L.b2 + 1) + '" width="' + w2 + '" height="3" rx="1.5"/>';

    /* what each stretch of a lane means; the cursor lights the one it stands in */
    s += '<text class="ar-in is-end" data-ar-l="1a" x="' + x1 + '" dx="' + (wide ? -12 : -8) + '" y="' + L.l1 + '">' + (wide ? "carries it out after a yes" : "after a yes") + "</text>";
    // on a narrow frame the stretch between the rules is too short for it: the empty track says it alone
    if (wide) s += '<text class="ar-in" data-ar-l="1b" x="' + x1 + '" dx="12" y="' + L.l1 + '">over its limit</text>';
    // narrow, the stretch between the rules is too short for it too, so it sits left of 100,000, over the same line
    s += '<text class="ar-in is-end" data-ar-l="2a" x="' + (wide ? x2 : x1) + '" dx="' + (wide ? -12 : -8) + '" y="' + L.l2 + '">one signature</text>';
    s += '<text class="ar-in" data-ar-l="2b" x="' + x2 + '" dx="' + (wide ? 12 : 8) + '" y="' + L.l2 + '">' + (wide ? "two signatures" : "two") + "</text>";
    s += "</g>";

    /* the axis */
    s += '<line class="ar-ax" x1="0" x2="100%" y1="' + L.ax + '" y2="' + L.ax + '"/>';
    stops().forEach(function (v) {
      var m = Math.round(v / Math.pow(10, Math.floor(Math.log(v) / Math.LN10 + 1e-9)));
      var len = m === 1 ? 8 : m === 5 ? 5 : 3;
      s += '<line class="ar-tk' + (m === 1 ? " is-d" : "") + '" x1="' + pc(fx(v)) + '" x2="' + pc(fx(v)) + '" y1="' + L.ax + '" y2="' + (L.ax + len) + '"/>';
    });
    var labels = wide
      ? [[100, "₽100"], [1000, "₽1,000"], [10000, "₽10,000"], [COPILOT, "₽100,000", 1], [SECOND, "₽500,000", 1], [1000000, "₽1,000,000"]]
      : [[100, "₽100"], [1000, "₽1k"], [10000, "₽10k"], [COPILOT, "₽100k", 1], [SECOND, "₽500k", 1]];
    labels.forEach(function (l) {
      s += '<text class="ar-nm' + (l[2] ? " is-bar" : "") + (l[0] === LO ? " is-first" : "") + '" x="' + pc(fx(l[0])) + '" y="' + (L.ax + 26) + '">' + l[1] + "</text>";
    });
    return s + "</svg>";
  }

  var api = {
    COPILOT: COPILOT, SECOND: SECOND, LO: LO, HI: HI,
    fx: fx, rAt: rAt, stops: stops, fmt: fmt,
    markers: function () {
      return {
        arScaleWide: function () { return build(true); },
        arScaleNarrow: function () { return build(false); }
      };
    }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ArFig = api;
})(this);
