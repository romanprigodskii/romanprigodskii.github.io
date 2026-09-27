/* Alfa-Romeo: the copilot's limits, on the page's own lines.

   The lines behind every page sit at m x 10^k on an e-value axis from 0.01
   to 1,680. Read in thousands of roubles, the same lines run from 10 roubles
   at the frame's left edge to 1,680,000 at its right, so the decade at 100
   is 100,000 roubles and the line at 500 is 500,000. The figure spans the
   whole frame and every tick it draws lands on a line of the paper.

   Two rules from the project, and nothing else, are drawn on it:
     100,000  the largest action the copilot may carry out, after a yes
     500,000  a business payment over this waits for a second signature

   Loaded by tools/figures.mjs (node) through markers(); in the browser the
   page script only moves a cursor over the pre-rendered SVG. */
(function (root) {
  "use strict";

  var COPILOT = 100000, SECOND = 500000, UNIT = 1000;

  function build(F, wide) {
    var pc = F.pc;
    function X(r) { return F.gx(r / UNIT); }
    var x1 = pc(X(COPILOT)), x2 = pc(X(SECOND));
    var L = wide
      ? { t1: 66, s1: 84, b1: 108, l1: 95, t2: 150, s2: 168, b2: 192, l2: 179, top: 38, ax: 226, H: 262, tf: "", sub: "" }
      : { t1: 62, s1: 78, b1: 100, l1: 88, t2: 136, s2: 152, b2: 174, l2: 162, top: 38, ax: 204, H: 238, tf: " is-n", sub: " is-n" };
    var s = '<svg class="ar-sc-svg' + (wide ? "" : " is-n") + '" width="100%" height="' + L.H + '" data-ax="' + L.ax + '" role="img" aria-labelledby="ar-sc-t' + (wide ? "w" : "n") + ' ar-sc-d' + (wide ? "w" : "n") + '">' +
      '<title id="ar-sc-t' + (wide ? "w" : "n") + '">What the copilot may carry out, and when a business payment waits for a second signature, by amount</title>' +
      '<desc id="ar-sc-d' + (wide ? "w" : "n") + '">A logarithmic scale of roubles from 10 to 1,680,000, drawn on the lines of the page. The copilot drafts an action and carries it out after a yes, up to 100,000 roubles, the largest action it may carry out. A business payment over 500,000 roubles waits for a second signature.</desc>';

    /* the paper, fully graduated where it is being read */
    s += '<g class="ar-sc-paper">';
    F.gridValues().forEach(function (g, i) {
      var c = F.gridClass(g);
      s += '<line class="ar-p ' + c + '" style="--i:' + i + '" x1="' + pc(F.gx(g.v)) + '" x2="' + pc(F.gx(g.v)) + '" y1="' + L.top + '" y2="' + L.ax + '"/>';
    });
    s += "</g>";

    /* the two rules */
    s += '<line class="ar-rule" x1="' + x1 + '" x2="' + x1 + '" y1="' + (L.top - 6) + '" y2="' + (L.ax + 14) + '"/>';
    s += '<line class="ar-rule" x1="' + x2 + '" x2="' + x2 + '" y1="' + (L.top - 6) + '" y2="' + (L.ax + 14) + '"/>';

    /* lane titles */
    s += '<text class="ar-lt' + L.tf + '" x="0" y="' + L.t1 + '">The copilot</text>';
    s += '<text class="ar-ls' + L.sub + '" x="0" y="' + L.s1 + '">drafts the action and waits for a yes</text>';
    s += '<text class="ar-lt' + L.tf + '" x="0" y="' + L.t2 + '">A business payment</text>';
    s += '<text class="ar-ls' + L.sub + '" x="0" y="' + L.s2 + '">in Romeo Business</text>';

    /* the lanes and what they mean, revealed up to the cursor as it sweeps */
    s += '<defs><clipPath id="ar-clip-' + (wide ? "w" : "n") + '"><rect class="ar-clip" x="0" y="0" width="100%" height="' + L.H + '"/></clipPath></defs>';
    s += '<g class="ar-lanes" clip-path="url(#ar-clip-' + (wide ? "w" : "n") + ')">';
    // lane 1: the copilot carries an action out after a yes, up to 100,000
    s += '<rect class="ar-bar" x="0" y="' + (L.b1 - 5) + '" width="' + x1 + '" height="10"/>';
    s += '<svg x="' + x1 + '" y="' + L.b1 + '" overflow="visible"><rect class="ar-stop" x="-1.5" y="-13" width="4" height="26"/></svg>';
    s += '<line class="ar-past" x1="' + x1 + '" x2="100%" y1="' + L.b1 + '" y2="' + L.b1 + '"/>';
    // lane 2: one signature up to 500,000, then a second
    s += '<line class="ar-sig" x1="0" x2="' + x2 + '" y1="' + L.b2 + '" y2="' + L.b2 + '"/>';
    s += '<line class="ar-sig is-2" x1="' + x2 + '" x2="100%" y1="' + (L.b2 - 3) + '" y2="' + (L.b2 - 3) + '"/>';
    s += '<line class="ar-sig is-2" x1="' + x2 + '" x2="100%" y1="' + (L.b2 + 3) + '" y2="' + (L.b2 + 3) + '"/>';

    /* what each stretch of a lane means; the cursor lights the one it stands in */
    s += '<text class="ar-in is-end" data-ar-l="1a" x="' + x1 + '" dx="' + (wide ? -12 : -8) + '" y="' + L.l1 + '">' + (wide ? "carries it out after a yes" : "after a yes") + "</text>";
    if (wide) s += '<text class="ar-in" data-ar-l="1b" x="' + x1 + '" dx="12" y="' + L.l1 + '">over its limit</text>';
    // on a narrow frame the stretch between the rules is too short for it, so it sits left of 100,000
    s += '<text class="ar-in is-end" data-ar-l="2a" x="' + (wide ? x2 : x1) + '" dx="' + (wide ? -12 : -8) + '" y="' + L.l2 + '">one signature</text>';
    s += '<text class="ar-in" data-ar-l="2b" x="' + x2 + '" dx="' + (wide ? 10 : 6) + '" y="' + L.l2 + '">' + (wide ? "two signatures" : "two") + "</text>";
    s += "</g>";

    /* the axis */
    s += '<line class="ar-ax" x1="0" x2="100%" y1="' + L.ax + '" y2="' + L.ax + '"/>';
    F.gridValues().forEach(function (g) {
      var c = F.gridClass(g), len = (c === "gd" || c === "g1" || c === "ge") ? 11 : (c === "gh" || c === "gb") ? 7 : 4;
      s += '<line class="ar-tk" x1="' + pc(F.gx(g.v)) + '" x2="' + pc(F.gx(g.v)) + '" y1="' + L.ax + '" y2="' + (L.ax + len) + '"/>';
    });
    var labels = wide
      ? [[10, "₽10"], [100, "₽100"], [1000, "₽1,000"], [10000, "₽10,000"], [COPILOT, "₽100,000", 1], [SECOND, "₽500,000", 1], [1000000, "₽1,000,000"]]
      : [[10, "₽10"], [100, "₽100"], [1000, "₽1k"], [10000, "₽10k"], [COPILOT, "₽100k", 1], [SECOND, "₽500k", 1]];
    labels.forEach(function (l) {
      s += '<text class="ar-nm' + (l[2] ? " is-bar" : "") + (l[0] === 10 ? " is-first" : "") + '" x="' + pc(X(l[0])) + '" y="' + (L.ax + (l[2] ? 30 : 28)) + '">' + l[1] + "</text>";
    });
    return s + "</svg>";
  }

  var api = {
    COPILOT: COPILOT, SECOND: SECOND, UNIT: UNIT,
    markers: function (F) {
      return {
        arScaleWide: function () { return build(F, true); },
        arScaleNarrow: function () { return build(F, false); }
      };
    }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ArFig = api;
})(this);
