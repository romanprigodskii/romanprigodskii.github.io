/* /work/gluline/: behaviour for the case page.

   Every figure is complete in the HTML; this only moves it.
   - The time ruler: once the graduation is down, the dimension line opens
     from the oldest files to the release and reads out the span in half
     months as it goes, then settles on "four and a half months".
   - The card figure: the switches work. Nothing switches the assistant on
     by itself; the reveal only draws the wires the current settings allow.
   - The release checklist: the test count runs up to 309 before its box is
     ticked (the rest of the checklist and the audit bar are CSS). */
(function () {
  "use strict";
  var RP = window.RP, G = window.GlFig;
  if (!RP) return;
  var still = RP.still, tween = RP.tween, EO = RP.EO, EIO = RP.EIO, watch = RP.watch;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function pc(f) { return (Math.round(f * 1e5) / 1e3) + "%"; }

  /* ------------------------------------------------ the time ruler */
  var gr = $("[data-gr]");
  if (gr && G) (function () {
    var parts = $$(".gr-svg", gr).map(function (svg) {
      return {
        svg: svg, xe: +svg.getAttribute("data-xe"), days: +svg.getAttribute("data-days"),
        dim: $("[data-gr-dim]", svg), ext: $("[data-gr-ext]", svg), arr: $("[data-gr-arr]", svg),
        read: $("[data-gr-read]", svg), au: $$("[data-gr-au]", svg)
      };
    });
    function set(p, e) {
      var f = p.xe * e, x = pc(f), days = p.days * e;
      p.dim.setAttribute("x2", x);
      p.ext.setAttribute("x1", x); p.ext.setAttribute("x2", x);
      p.arr.setAttribute("x", x);
      p.svg.classList.toggle("is-short", e < 0.03);
      var t = e >= 1 ? G.AT_REST : G.halfMonths(days);
      if (p.read.textContent !== t) p.read.textContent = t;
      var W = p.svg.getBoundingClientRect().width;
      var half = W ? (p.read.getComputedTextLength() / W) / 2 : 0;
      p.read.setAttribute("x", pc(Math.max(f / 2, half + 0.004)));
      p.au.forEach(function (g) { g.classList.toggle("on", days >= +g.getAttribute("data-d") + 3); });
    }
    if (still()) return;
    gr.classList.add("is-pre");
    parts.forEach(function (p) { set(p, 0); });
    watch(gr, function () {
      setTimeout(function () {
        tween(2300, EIO, function (e) { parts.forEach(function (p) { set(p, e); }); }, function () {
          parts.forEach(function (p) { set(p, 1); });
          gr.classList.remove("is-pre");
        });
      }, 520);
    });
  })();

  /* ------------------------------------------------ the card every chat carries */
  var sw = $("[data-sw]");
  if (sw) (function () {
    var all = $("[data-sw-all]", sw), allV = $("[data-sw-all-v]", sw), out = $("[data-sw-read]", sw);
    var cards = $$("[data-chat]", sw);
    var st = { all: all.getAttribute("aria-checked") === "true" };
    cards.forEach(function (c) { st[c.getAttribute("data-chat")] = $("button", c).getAttribute("aria-checked") === "true"; });
    function render() {
      var n = 0;
      sw.classList.toggle("is-all", st.all);
      all.setAttribute("aria-checked", String(st.all));
      allV.textContent = st.all ? "on" : "off";
      cards.forEach(function (c) {
        var k = c.getAttribute("data-chat"), read = st.all && st[k];
        $("button", c).setAttribute("aria-checked", String(st[k]));
        c.classList.toggle("is-read", read);
        sw.classList.toggle(k + "-read", read);
        if (read) n++;
      });
      out.textContent = !st.all ? "Off. Your chats are never passed to it."
        : n === cards.length ? "Can read both of these chats."
        : n ? "Can read one of these two chats." : "Can read neither of these chats.";
    }
    all.disabled = false;
    all.addEventListener("click", function () { st.all = !st.all; render(); });
    cards.forEach(function (c) {
      var b = $("button", c), k = c.getAttribute("data-chat");
      b.disabled = false;
      b.addEventListener("click", function () { st[k] = !st[k]; render(); });
    });
    watch(sw);
  })();

  /* ------------------------------------------------ the release checklist */
  var gate = $("[data-gate]");
  if (gate) (function () {
    var n = $("[data-gate-n]", gate);
    if (!still()) n.textContent = "0";
    watch(gate, function () {
      if (still()) { n.textContent = "309"; return; }
      setTimeout(function () {
        tween(1300, EO, function (e) { n.textContent = String(Math.round(309 * e)); });
      }, 500);
    });
  })();
})();
