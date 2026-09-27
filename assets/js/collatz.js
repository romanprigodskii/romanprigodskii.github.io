/* The Collatz entry on /research/: the path of any starting number down to 1,
   on a log scale. The markup carries the path of 27, so the figure is complete
   without this script; the script lets a reader pick another number. */
(function (root) {
  "use strict";
  var W = 1000, H = 340, L = 64, R = 16, T = 18, B = 40;
  function path(n) { var s = [n]; while (n !== 1) { n = n % 2 === 0 ? n / 2 : 3 * n + 1; s.push(n); } return s; }
  function fmt(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function draw(n) {
    var s = path(n), top = Math.max.apply(null, s), steps = s.length - 1;
    var dec = Math.max(1, Math.ceil(Math.log10(top) + 1e-9));
    function X(i) { return L + (steps ? i / steps : 0) * (W - L - R); }
    function Y(v) { return T + (1 - Math.log10(v) / dec) * (H - T - B); }
    var o = '<g class="cz-grid">';
    for (var k = 0; k <= dec; k++) {
      var v = Math.pow(10, k), y = Y(v).toFixed(1);
      o += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/><text x="' + (L - 10) + '" y="' + (+y + 4) + '">' + fmt(v) + "</text>";
    }
    o += '</g><text class="cz-ax" x="' + (W - R) + '" y="' + (H - 10) + '">' + fmt(steps) + " steps</text>";
    var d = "";
    for (var i = 0; i < s.length; i++) d += (i ? " L" : "M") + X(i).toFixed(1) + " " + Y(s[i]).toFixed(1);
    var pk = s.indexOf(top);
    o += '<path class="cz-line" d="' + d + '"/>';
    o += '<circle class="cz-dot" cx="' + X(pk).toFixed(1) + '" cy="' + Y(top).toFixed(1) + '" r="4.5"/>';
    o += '<text class="cz-pk" x="' + X(pk).toFixed(1) + '" y="' + (Y(top) - 10).toFixed(1) + '" text-anchor="' + (pk / Math.max(1, steps) > 0.8 ? "end" : "middle") + '">' + fmt(top) + "</text>";
    return { svg: o, steps: steps, top: top };
  }
  function say(n, r) { return fmt(n) + " reaches 1 in " + fmt(r.steps) + " steps" + (r.top > n ? ", climbing as high as " + fmt(r.top) + " on the way." : ", and never climbs above where it started."); }
  if (typeof module !== "undefined" && module.exports) { module.exports = { draw: draw, say: say, W: W, H: H }; return; }
  var fig = document.getElementById("collatz");
  if (!fig) return;
  var g = fig.querySelector("[data-cz-g]"), out = fig.querySelector("[data-cz-say]"), inp = fig.querySelector("[data-cz-n]"), num = fig.querySelector("[data-cz-num]");
  var ctl = fig.querySelector("[data-cz-ctl]");
  if (ctl) ctl.hidden = false;
  function set(n) {
    n = Math.max(2, Math.min(9999, Math.round(+n || 27)));
    var r = draw(n);
    g.innerHTML = r.svg;
    out.textContent = say(n, r);
    if (inp && +inp.value !== n && n <= +inp.max) inp.value = n;
    if (num) num.textContent = fmt(n);
    if (inp) inp.setAttribute("aria-valuetext", say(n, r));
  }
  if (inp) inp.addEventListener("input", function () { set(inp.value); });
  fig.querySelectorAll("[data-cz-pick]").forEach(function (b) { b.addEventListener("click", function () { set(b.getAttribute("data-cz-pick")); }); });
})(this);
