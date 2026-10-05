/* /work/vertex-boxing/: behaviour for this page's figures.

   The figures are pre-rendered (tools/figures.mjs, assets/js/figures-vertex-boxing.js)
   and read correctly without this file. It adds two things:
   - marks that travel: each [data-from] group starts at data-from and slides
     to data-f (fractions of its figure's width) when the figure comes into
     view: an e-value from 1, where every e-value starts; a model's reading
     from the price it is measured against;
   - today, on the forward test's time ruler. */
(function () {
  "use strict";
  var RP = window.RP;
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  /* ------------------------------------------------ today on the forward test */
  $$(".lt-today").forEach(function (g) {
    var t0 = +g.getAttribute("data-t0"), t4 = +g.getAttribute("data-t4");
    var a = +g.getAttribute("data-a"), b = +g.getAttribute("data-b"), now = Date.now();
    if (!(now >= t0 && now <= t4)) return;
    var x = ((a + (now - t0) / (t4 - t0) * (b - a)) * 100).toFixed(3) + "%";
    var d = new Date(now);
    $$("line", g).forEach(function (l) { l.setAttribute("x1", x); l.setAttribute("x2", x); });
    $$("text", g).forEach(function (t) {
      t.setAttribute("x", x);
      t.textContent = "today, " + d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
    });
    g.removeAttribute("display");
  });

  /* ------------------------------------------------ marks that travel */
  if (!RP || RP.still()) return;
  $$("[data-slide]").forEach(function (fig) {
    var marks = $$("[data-from]", fig).map(function (g) {
      var svg = g.ownerSVGElement, W = svg ? svg.getBoundingClientRect().width : 0;
      if (!W) return null;
      var from = parseFloat(g.getAttribute("data-from")), to = parseFloat(g.getAttribute("data-f"));
      var dx = (from - to) * W;
      g.setAttribute("transform", "translate(" + dx.toFixed(2) + " 0)");
      // an e-value that leaves the scale draws its trail from 1 as it goes
      var tr = g.previousElementSibling;
      if (!(tr && /\bck-trail\b/.test(tr.getAttribute("class") || ""))) tr = null;
      if (tr) tr.setAttribute("x2", (from * 100).toFixed(3) + "%");
      return { g: g, dx: dx, tr: tr, from: from, to: to, i: parseFloat(g.style.getPropertyValue("--i")) || 0 };
    }).filter(Boolean);
    if (!marks.length) return;
    function go() {
      marks.forEach(function (m) {
        setTimeout(function () {
          RP.tween(1400, RP.EO, function (e) {
            m.g.setAttribute("transform", "translate(" + (m.dx * (1 - e)).toFixed(2) + " 0)");
            if (m.tr) m.tr.setAttribute("x2", ((m.from + (m.to - m.from) * e) * 100).toFixed(3) + "%");
          });
        }, m.i * 120);
      });
    }
    if (fig.classList.contains("in")) go(); else RP.watch(fig, go);
  });
})();
