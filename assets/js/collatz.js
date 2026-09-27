/* The Collatz entry on /research/: the path of any starting number down to 1,
   on a log scale. The markup carries the path of 27, pre-rendered twice by
   tools/figures.mjs (markers czWide and czNarrow, a laptop's and a phone's
   drawing), so the figure is complete and legible without this script. The
   script draws in real pixels: the viewBox is the figure's own width, so the
   13px labels are 13px at every width; and it lets a reader pick another
   number. */
(function (root) {
  "use strict";
  var R = 16, T = 18, B = 40;
  function path(n) { var s = [n]; while (n !== 1) { n = n % 2 === 0 ? n / 2 : 3 * n + 1; s.push(n); } return s; }
  function fmt(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function stepsWord(k) { return fmt(k) + (k === 1 ? " step" : " steps"); }
  /* the height a drawing W pixels wide gets */
  function height(W) { return Math.round(Math.max(220, Math.min(340, W * 0.45))); }
  function draw(n, W, H) {
    var s = path(n), top = Math.max.apply(null, s), steps = s.length - 1;
    var dec = Math.max(1, Math.ceil(Math.log10(top) + 1e-9));
    var L = dec >= 6 ? 72 : 64;                                    // room for "1,000,000"
    function X(i) { return L + (steps ? i / steps : 0) * (W - L - R); }
    function Y(v) { return T + (1 - Math.log10(v) / dec) * (H - T - B); }
    var o = '<g class="cz-grid">';
    for (var k = 0; k <= dec; k++) {
      var v = Math.pow(10, k), y = Y(v).toFixed(1);
      o += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/><text x="' + (L - 10) + '" y="' + (+y + 4) + '">' + fmt(v) + "</text>";
    }
    o += '</g><text class="cz-ax" x="' + (W - R) + '" y="' + (H - 10) + '">' + stepsWord(steps) + "</text>";
    var d = "";
    for (var i = 0; i < s.length; i++) d += (i ? " L" : "M") + X(i).toFixed(1) + " " + Y(s[i]).toFixed(1);
    var pk = s.indexOf(top), f = pk / Math.max(1, steps);
    o += '<path class="cz-line" d="' + d + '"/>';
    o += '<circle class="cz-dot" cx="' + X(pk).toFixed(1) + '" cy="' + Y(top).toFixed(1) + '" r="4.5"/>';
    // the peak's value: centred over it, or set in from the ends of the path
    o += '<text class="cz-pk" x="' + X(pk).toFixed(1) + '" y="' + (Y(top) - 10).toFixed(1) + '" text-anchor="' + (f > 0.8 ? "end" : f < 0.12 ? "start" : "middle") + '"' + (f < 0.12 ? ' dx="-4"' : f > 0.8 ? ' dx="4"' : "") + ">" + fmt(top) + "</text>";
    return { svg: o, steps: steps, top: top };
  }
  function say(n, r) { return fmt(n) + " reaches 1 in " + stepsWord(r.steps) + (r.top > n ? ", climbing as high as " + fmt(r.top) + " on the way." : ", and never climbs above where it started."); }
  /* the whole figure, for the pre-render */
  function svg(n, W, sfx) {
    var H = height(W);
    return '<svg class="rs-cz-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-labelledby="cz-t' + sfx + '"><title id="cz-t' + sfx + '">The path of a starting number down to 1, on a log scale</title><g data-cz-g>' + draw(n, W, H).svg + "</g></svg>";
  }
  if (typeof module !== "undefined" && module.exports) { module.exports = { draw: draw, say: say, svg: svg, height: height }; return; }
  var fig = document.getElementById("collatz");
  if (!fig) return;
  var el = fig.querySelector(".cz-w .rs-cz-svg") || fig.querySelector(".rs-cz-svg");
  if (!el) return;
  var g = el.querySelector("[data-cz-g]"), out = fig.querySelector("[data-cz-say]"), inp = fig.querySelector("[data-cz-n]"), num = fig.querySelector("[data-cz-num]");
  var ctl = fig.querySelector("[data-cz-ctl]");
  if (ctl) ctl.hidden = false;
  // one drawing from here on, sized to the figure
  fig.classList.add("is-live");
  var cur = 27, W = 0, H = 0;
  function size() {
    var w = Math.round(el.getBoundingClientRect().width);
    if (!w || w === W) return false;
    W = w; H = height(W);
    el.setAttribute("viewBox", "0 0 " + W + " " + H);
    return true;
  }
  function set(n) {
    n = Math.max(2, Math.min(9999, Math.round(+n || 27)));
    cur = n;
    size();
    var r = draw(n, W || 760, H || height(760));
    g.innerHTML = r.svg;
    out.textContent = say(n, r);
    if (inp && +inp.value !== n && n <= +inp.max) inp.value = n;
    if (num) num.textContent = fmt(n);
    if (inp) inp.setAttribute("aria-valuetext", say(n, r));
  }
  set(inp ? inp.value : 27);
  if (typeof ResizeObserver === "function") new ResizeObserver(function () { if (size()) g.innerHTML = draw(cur, W, H).svg; }).observe(el);
  else root.addEventListener("resize", function () { if (size()) g.innerHTML = draw(cur, W, H).svg; });
  if (inp) inp.addEventListener("input", function () { set(inp.value); });
  fig.querySelectorAll("[data-cz-pick]").forEach(function (b) { b.addEventListener("click", function () { set(b.getAttribute("data-cz-pick")); }); });
})(this);
