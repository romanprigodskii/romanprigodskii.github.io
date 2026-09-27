/* /work/gluline/: behaviour for the case page.

   Every figure is complete in the HTML; this only moves it.
   - The timeline: once the graduation is in, the track fills from the
     oldest files to the release, its knob riding the front, and the readout
     counts the span in half months as it goes, settling on 4½ months.
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

  /* ------------------------------------------------ the timeline */
  var gr = $("[data-gr]");
  if (gr && G) (function () {
    var read = $("[data-gr-read]", gr);
    var parts = $$(".gr-svg", gr).map(function (svg) {
      return {
        xe: +svg.getAttribute("data-xe"),
        fill: $("[data-gr-fill]", svg), knob: $("[data-gr-knob]", svg), au: $$("[data-gr-au]", svg)
      };
    });
    function set(e) {
      var days = G.DAYS * e;
      parts.forEach(function (p) {
        var x = pc(p.xe * e);
        p.fill.setAttribute("width", x);
        p.knob.setAttribute("cx", x);
        p.au.forEach(function (g) { g.classList.toggle("on", days >= +g.getAttribute("data-d") + 3); });
      });
      var t = e >= 1 ? G.AT_REST : G.halfMonths(days);
      if (read.textContent !== t) read.textContent = t || " ";
    }
    if (still()) return;
    gr.classList.add("is-pre");
    set(0);
    watch(gr, function () {
      setTimeout(function () {
        tween(2300, EIO, set, function () {
          set(1);
          gr.classList.remove("is-pre");
        });
      }, 480);
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
