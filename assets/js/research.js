/* /research/: behaviour on top of site.js (window.RP) and figures.js
   (window.Fig). Every figure here is already complete in the HTML; this
   file adds the readout of the 84, the motion that carries a figure's
   meaning, and the two school projects' controls. With motion reduced,
   nothing moves: the figures stay in their drawn, final state. */
(function () {
  "use strict";
  var RP = window.RP, F = window.Fig;
  if (!RP || !F) return;
  var still = RP.still, tween = RP.tween, EO = RP.EO, EIO = RP.EIO;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function later(ms, fn) { return setTimeout(fn, ms); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function pct(s) { return parseFloat(s) / 100; }
  var hasIO = "IntersectionObserver" in window;

  /* reveal when a good part of the figure is on screen, not its first pixel */
  function seen(el, fn, thr) {
    if (!el) return;
    if (!hasIO) { el.classList.add("in"); fn(); return; }
    var o = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        o.disconnect();
        el.classList.add("in");
        fn();
      });
    }, { threshold: thr || 0.3 });
    o.observe(el);
  }
  function isNarrow(el) { return !!(el.closest && el.closest(".fl-narrow")); }
  function width(el) { return el.getBoundingClientRect().width; }

  /* ------------------------------------------------------------ the 84
     x is the page's own e-axis, so the vertical lines behind the plot are
     its graduations. Pointing, tapping or the arrow keys select a mark; the
     readout names it. On arrival every mark starts where it would sit with
     no margin, at its fair-odds e-value on both axes, and drops to what the
     same bet made after the bookmaker's margin. */
  (function scatter() {
    var fig = $("[data-sc]"), src = $("#rs-rows");
    if (!fig || !src) return;
    var rows;
    try { rows = JSON.parse(src.textContent); } catch (e) { return; }
    var plot = $("[data-sc-plot]", fig), ro = $("[data-sc-ro]", fig);
    var VERDICT = {
      both: "Clears 20 at fair odds and after the margin, on the most favourable of five seeds: its five-seed median is 12.3. The bar for all 84 at once is 1,680.",
      fair: "Clears 20 at fair odds, then loses it to the book’s margin. The bar for all 84 at once is 1,680.",
      up: "Made money at fair odds, and stopped short of the bar of 20.",
      down: "Lost money at fair odds: an e-value below 1 is a bankroll that shrank."
    };
    function verdict(r) { return r.er >= 20 ? VERDICT.both : r.ef >= 20 ? VERDICT.fair : r.ef >= 1 ? VERDICT.up : VERDICT.down; }
    function rankOf(i) { var c = 0; rows.forEach(function (r) { if (r.ef > rows[i].ef) c++; }); return c + 1; }
    var best = 0;
    rows.forEach(function (r, i) { if (r.ef > rows[best].ef) best = i; });
    var st = { pinned: best, on: best, fam: "" };

    var sets = $$("svg.rs-sc-svg", fig).map(function (svg) {
      var m = {};
      $$(".rs-m", svg).forEach(function (c) { m[+c.getAttribute("data-i")] = c; });
      return {
        svg: svg, m: m, narrow: isNarrow(svg),
        guide: $("[data-sc-guide]", svg), gx: $(".rs-gx", svg), gy: $(".rs-gy", svg), ring: $(".rs-ring", svg),
        y0: +svg.getAttribute("data-y0"), y20: +svg.getAttribute("data-y20")
      };
    });
    function active() {
      for (var k = 0; k < sets.length; k++) if (width(sets[k].svg) > 0) return sets[k];
      return sets[0];
    }
    var RO = {};
    $$("[data-ro]", ro).forEach(function (el) { RO[el.getAttribute("data-ro")] = el; });
    function fill(i) {
      var r = rows[i];
      RO.s.textContent = RP.sliceName(r.s);
      RO.f.textContent = RP.FAM[r.f];
      RO.n.textContent = F.fmtInt(r.n);
      RO.ef.textContent = "e = " + F.fmtE(r.ef);
      RO.ef.classList.toggle("is-hit", r.ef >= 20);
      RO.er.textContent = "e = " + F.fmtE(r.er);
      RO.er.classList.toggle("is-hit", r.er >= 20);
      RO.r.textContent = "Rank " + rankOf(i) + " of 84 at fair odds";
      RO.t.textContent = verdict(r);
    }
    function show(i) {
      if (i < 0 || i === st.on) return;
      st.on = i;
      sets.forEach(function (S) {
        $$(".rs-m.is-on", S.svg).forEach(function (c) { c.classList.remove("is-on"); });
        var c = S.m[i];
        if (!c) return;
        c.classList.add("is-on");
        c.parentNode.appendChild(c);
        var cx = c.getAttribute("cx"), cy = c.getAttribute("data-y"), r = +c.getAttribute("r");
        S.guide.classList.toggle("is-off", c.classList.contains("is-off"));
        S.gx.setAttribute("x1", cx); S.gx.setAttribute("x2", cx); S.gx.setAttribute("y1", cy);
        S.gy.setAttribute("x1", cx); S.gy.setAttribute("y1", cy); S.gy.setAttribute("y2", cy);
        S.ring.setAttribute("cx", cx); S.ring.setAttribute("cy", cy); S.ring.setAttribute("r", (r + 5).toFixed(2));
      });
      fill(i);
    }
    function pin(i) { if (i < 0) return; st.pinned = i; show(i); }
    function visible() {
      return rows.map(function (r, i) { return i; }).filter(function (i) { return !st.fam || rows[i].f === st.fam; });
    }
    function nearest(ev, rad) {
      var S = active(), rect = S.svg.getBoundingClientRect(), W = rect.width;
      var x = ev.clientX - rect.left, y = ev.clientY - rect.top, hit = -1, bd = rad * rad;
      Object.keys(S.m).forEach(function (k) {
        var c = S.m[k];
        if (c.classList.contains("is-dim")) return;
        var cs = c.getAttribute("cx"), px = cs.indexOf("%") > 0 ? pct(cs) * W : parseFloat(cs);
        var dx = px - x, dy = +c.getAttribute("data-y") - y, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; hit = +k; }
      });
      return hit;
    }
    sets.forEach(function (S) {
      var svg = S.svg;
      svg.setAttribute("tabindex", "0");
      svg.setAttribute("aria-describedby", "rs-ro-live");
      svg.addEventListener("pointermove", function (ev) {
        if (ev.pointerType === "touch") return;
        var i = nearest(ev, 34);
        show(i >= 0 ? i : st.pinned);
      });
      svg.addEventListener("pointerleave", function () { show(st.pinned); });
      svg.addEventListener("pointerup", function (ev) { pin(nearest(ev, ev.pointerType === "mouse" ? 34 : 46)); });
      svg.addEventListener("keydown", function (ev) {
        var k = ev.key, keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
        if (k === "Escape") { pin(best); return; }
        if (keys.indexOf(k) < 0) return;
        ev.preventDefault();
        var dim = (k === "ArrowUp" || k === "ArrowDown") ? "er" : "ef";
        var order = visible().sort(function (a, b) { return (rows[a][dim] - rows[b][dim]) || (rows[a].ef - rows[b].ef) || (a - b); });
        var at = order.indexOf(st.on), next;
        if (k === "Home") next = order[0];
        else if (k === "End") next = order[order.length - 1];
        else {
          var step = (k === "ArrowRight" || k === "ArrowUp") ? 1 : -1;
          next = at < 0 ? order[step > 0 ? 0 : order.length - 1] : order[clamp(at + step, 0, order.length - 1)];
        }
        pin(next);
      });
    });
    ro.id = "rs-ro-live";

    /* nine families: pressing one dims the rest and reads out its best */
    var chips = $$(".rs-chip", fig);
    function setFam(f) {
      if (f && f === st.fam) f = "";
      st.fam = f;
      chips.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-fam") === f)); });
      sets.forEach(function (S) {
        Object.keys(S.m).forEach(function (k) { S.m[k].classList.toggle("is-dim", !!f && rows[k].f !== f); });
      });
      var pick = best;
      if (f) {
        pick = -1;
        rows.forEach(function (r, i) { if (r.f === f && (pick < 0 || r.ef > rows[pick].ef)) pick = i; });
      }
      st.on = -1;
      pin(pick);
    }
    chips.forEach(function (b) { b.addEventListener("click", function () { setFam(b.getAttribute("data-fam")); }); });

    /* the margin, taken: from the fair-odds diagonal down to what each bet kept */
    if (still()) return;
    fig.classList.add("rs-anim");
    function colour(S, c, y) {
      var i = +c.getAttribute("data-i");
      if (rows[i].ef >= 20) c.classList.toggle("is-up", y <= S.y20 + 0.5);
    }
    sets.forEach(function (S) {
      Object.keys(S.m).forEach(function (k) {
        var c = S.m[k], ys = c.getAttribute("data-ys");
        if (ys === null) return;
        c.setAttribute("cy", ys);
        colour(S, c, +ys);
      });
    });
    seen(plot, function () {
      var last = 0;
      sets.forEach(function (S) {
        var ids = Object.keys(S.m).map(Number).filter(function (k) { return S.m[k].hasAttribute("data-ys"); });
        ids.sort(function (a, b) { return rows[a].ef - rows[b].ef; });
        ids.forEach(function (k, j) {
          var c = S.m[k], y0 = +c.getAttribute("data-ys"), y1 = +c.getAttribute("data-y");
          var delay = 250 + j * 15;
          last = Math.max(last, delay);
          later(delay, function () {
            tween(1250, EO, function (e) {
              var y = y0 + (y1 - y0) * e;
              c.setAttribute("cy", y.toFixed(2));
              colour(S, c, y);
            });
          });
        });
      });
      later(last + 1250, function () { fig.classList.add("is-settled"); });
    }, 0.35);
  })();

  /* ------------------------------------------------------------ 4.81 against 20
     The needle rises to what the segment has earned. Then the bouts run at
     one speed for both prices: at fair odds the projection reaches 20 after
     100, and the hatched gap fills as it goes; at the book's prices the
     count runs on to 253. */
  (function wait() {
    var fig = $("[data-wt]");
    if (!fig || still()) return;
    var parts = [];
    $$("svg.rs-wt-svg", fig).forEach(function (svg) {
      /* a variant that is not on screen stays drawn in full, labels included */
      if (!width(svg)) { $$("[data-wt-t], [data-wt-end]", svg).forEach(function (t) { t.classList.add("is-on"); }); return; }
      var nd = $("[data-wt-needle]", svg), gap = $("[data-wt-gap]", svg), ghost = $("[data-wt-ghost]", svg);
      var p = {
        svg: svg, g: $(".rs-ng", nd), gap: gap, ghost: ghost,
        f: +nd.getAttribute("data-f"), f0: +nd.getAttribute("data-f0"),
        gx: pct(gap.getAttribute("x")), gw: pct(gap.getAttribute("data-w")),
        bars: $$("[data-wt-bar]", svg).map(function (b) {
          return { el: b, n: +b.getAttribute("data-b"), x1: pct(b.getAttribute("x1")), x2: pct(b.getAttribute("x2")), y: +b.getAttribute("y1"), i: b.getAttribute("data-wt-bar") };
        })
      };
      p.g.setAttribute("transform", "translate(" + ((p.f0 - p.f) * width(svg)).toFixed(2) + ",0)");
      gap.setAttribute("width", "0%");
      p.bars.forEach(function (b) { b.el.setAttribute("x2", (b.x1 * 100) + "%"); });
      parts.push(p);
    });
    if (!parts.length) return;
    fig.classList.add("rs-anim");
    var NS = "http://www.w3.org/2000/svg";
    seen(fig, function () {
      parts.forEach(function (p) {
        var W = width(p.svg), from = (p.f0 - p.f) * W;
        tween(1300, EO, function (e) { p.g.setAttribute("transform", "translate(" + (from * (1 - e)).toFixed(2) + ",0)"); });
        var counters = p.bars.map(function (b) {
          var t = document.createElementNS(NS, "text");
          t.setAttribute("class", "rs-wcount");
          t.setAttribute("y", b.y + 4.5);
          t.setAttribute("dx", "9");
          p.svg.appendChild(t);
          return t;
        });
        var MAX = 253, done = {};
        later(1100, function () {
          p.ghost.setAttribute("x1", (p.gx * 100) + "%"); p.ghost.setAttribute("x2", (p.gx * 100) + "%");
          p.ghost.classList.add("is-on");
          tween(MAX * 9, function (x) { return x; }, function (e) {
            var b = MAX * e, fair = Math.min(b, 100) / 100;
            p.gap.setAttribute("width", (p.gw * fair * 100).toFixed(3) + "%");
            var gxNow = ((p.gx + p.gw * fair) * 100).toFixed(3) + "%";
            p.ghost.setAttribute("x1", gxNow); p.ghost.setAttribute("x2", gxNow);
            p.bars.forEach(function (bar, j) {
              var n = Math.min(b, bar.n), x = bar.x1 + (bar.x2 - bar.x1) * n / bar.n;
              bar.el.setAttribute("x2", (x * 100).toFixed(3) + "%");
              var c = counters[j];
              if (n < bar.n) { c.setAttribute("x", (x * 100).toFixed(3) + "%"); c.textContent = Math.round(n); }
              else if (!done[j]) {
                done[j] = true;
                c.remove();
                $$('[data-wt-t="' + bar.i + '"], [data-wt-end="' + bar.i + '"]', p.svg).forEach(function (t) { t.classList.add("is-on"); });
                if (j === 0) later(500, function () { p.ghost.classList.remove("is-on"); });
              }
            });
          });
        });
      });
    }, 0.45);
  })();

  /* ------------------------------------------------------------ the ladder
     The three mixtures sweep up from e = 1; only the first crosses 20 and
     turns red. Then each is charged the margin and slides back. */
  (function ladder() {
    var fig = $("[data-ld]");
    if (!fig || still()) return;
    var parts = [];
    $$("svg.rs-ld-svg", fig).forEach(function (svg) {
      var W = width(svg);
      if (!W) return;
      var f0 = isNarrow(svg) ? 0.02 : F.gx(1), fb = isNarrow(svg) ? 0.02 + Math.log10(20) / 2 * 0.96 : F.gx(20);
      var fair = $$("[data-ld-fair]", svg).map(function (n) {
        var o = { n: n, g: $(".rs-ng", n), f: +n.getAttribute("data-f"), hit: +n.getAttribute("data-e") >= 20 };
        o.g.setAttribute("transform", "translate(" + ((f0 - o.f) * W).toFixed(2) + ",0)");
        n.classList.remove("is-hit");
        return o;
      });
      var real = $$("[data-ld-real]", svg).map(function (n) {
        var o = { n: n, g: $(".rs-ng", n), f: +n.getAttribute("data-f"), ff: +n.getAttribute("data-ff") };
        o.g.setAttribute("transform", "translate(" + ((o.ff - o.f) * W).toFixed(2) + ",0)");
        return o;
      });
      parts.push({ svg: svg, fair: fair, real: real, f0: f0, fb: fb });
    });
    if (!parts.length) return;
    fig.classList.add("rs-anim");
    seen(fig, function () {
      parts.forEach(function (p) {
        var W = width(p.svg);
        p.fair.forEach(function (o, i) {
          later(i * 170, function () {
            tween(1500, EO, function (e) {
              var x = p.f0 + (o.f - p.f0) * e;
              o.g.setAttribute("transform", "translate(" + ((x - o.f) * W).toFixed(2) + ",0)");
              if (o.hit) o.n.classList.toggle("is-hit", x >= p.fb - 0.0005);
            });
          });
        });
        later(1500 + 2 * 170, function () { fig.classList.add("is-fair"); });
        later(1500 + 2 * 170 + 450, function () {
          fig.classList.add("is-real");
          p.real.forEach(function (o, i) {
            later(i * 120, function () {
              tween(1200, EIO, function (e) {
                var x = o.ff + (o.f - o.ff) * e;
                o.g.setAttribute("transform", "translate(" + ((x - o.f) * W).toFixed(2) + ",0)");
              });
            });
          });
          later(1200 + 240, function () { fig.classList.add("is-done"); });
        });
      });
    }, 0.45);
  })();

  /* ------------------------------------------------------------ the echo
     The re-seeded bar grows under the shipped one; the number counts the
     share it reaches, in step with it. */
  (function echo() {
    var fig = $("[data-echo]");
    if (!fig || still()) return;
    var num = $("[data-echo-n]", fig);
    fig.classList.add("rs-anim");
    num.textContent = "0";
    seen(fig, function () {
      later(700, function () { tween(1400, EO, function (e) { num.textContent = String(Math.round(79.6 * e)); }, function () { num.textContent = "80"; }); });
    }, 0.4);
  })();

  /* ------------------------------------------------------------ the seed budget: read any seed count */
  $$("svg.rs-bu-svg").forEach(function (svg) {
    var ro = $("[data-bu-ro]", svg), box = $(".rs-bro-b", ro), txt = $(".rs-bro-t", ro), dots = {};
    $$(".rs-bd", svg).forEach(function (d) { dots[d.getAttribute("data-k")] = d; });
    function on(k) {
      var d = dots[k];
      if (!d) return;
      $$(".rs-bd.is-hov", svg).forEach(function (x) { x.classList.remove("is-hov"); });
      d.classList.add("is-hov");
      txt.textContent = k + (k === 1 ? " seed: " : " seeds: ") + d.getAttribute("data-v") + " nats";
      ro.setAttribute("visibility", "visible");
      var W = width(svg), cx = pct(d.getAttribute("cx")) * W, cy = +d.getAttribute("cy");
      var tw = txt.getComputedTextLength() + 18, x = clamp(cx - tw / 2, 0, W - tw);
      box.setAttribute("x", x.toFixed(1)); box.setAttribute("y", (cy - 40).toFixed(1)); box.setAttribute("width", tw.toFixed(1));
      txt.setAttribute("x", (x + 9).toFixed(1)); txt.setAttribute("y", (cy - 23.5).toFixed(1));
    }
    function off() {
      ro.setAttribute("visibility", "hidden");
      $$(".rs-bd.is-hov", svg).forEach(function (x) { x.classList.remove("is-hov"); });
    }
    $$(".rs-bhit", svg).forEach(function (r) {
      var k = +r.getAttribute("data-k");
      r.addEventListener("pointerenter", function () { on(k); });
      r.addEventListener("pointerdown", function () { on(k); });
    });
    svg.addEventListener("pointerleave", off);
  });

  /* ------------------------------------------------------------ before the papers: the newspaper's edge
     (ported from the previous site's ui.js, wave()). It draws in as it rises
     into view, and the fitted curve can be swapped for a triangle wave,
     which turns into it point by point. */
  (function wave() {
    var fig = document.getElementById("wave"), src = document.getElementById("waveData");
    if (!fig || !src) return;
    var D;
    try { D = JSON.parse(src.textContent); } catch (e) { return; }
    var fit = $(".wave__fit", fig), miss = $(".wave__miss", fig), read = document.getElementById("waveRead");
    var btns = $$("[data-fit]", fig);
    var WORDS = {
      s: "A sine misses the traced edge by 1.8% of its height.",
      t: "A triangle wave, given the same freedom, misses by 4.8%, most of it at the crests and troughs."
    };
    var cur = "s", curve = D.s.slice(), res = D.rs.slice(), raf = 0;
    function line(xs, ys, gap) {
      var out = "", prev = null;
      for (var i = 0; i < xs.length; i++) {
        out += (prev == null || (gap && xs[i] - prev > gap) ? "M" : "L") + xs[i] + " " + ys[i].toFixed(1) + " ";
        prev = xs[i];
      }
      return out;
    }
    function draw() {
      fit.setAttribute("d", line(D.x, curve));
      miss.setAttribute("d", line(D.rx, res, 12));
    }
    function pick(key) {
      if (key === cur) return;
      cur = key;
      btns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-fit") === key)); });
      fig.classList.toggle("is-tri", key === "t");
      if (read) read.textContent = WORDS[key];
      var c0 = curve.slice(), r0 = res.slice(), c1 = D[key], r1 = D["r" + key];
      cancelAnimationFrame(raf);
      if (still()) { curve = c1.slice(); res = r1.slice(); draw(); return; }
      var t0 = null;
      raf = requestAnimationFrame(function step(t) {
        if (t0 == null) t0 = t;
        var p = clamp((t - t0) / 700, 0, 1), e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p), i;
        for (i = 0; i < curve.length; i++) curve[i] = c0[i] + (c1[i] - c0[i]) * e;
        for (i = 0; i < res.length; i++) res[i] = r0[i] + (r1[i] - r0[i]) * e;
        draw();
        if (p < 1) raf = requestAnimationFrame(step);
      });
    }
    btns.forEach(function (b) { b.addEventListener("click", function () { pick(b.getAttribute("data-fit")); }); });

    if (still()) return;
    var last = -1, on = false, q = false;
    function frame() {
      q = false;
      var vh = window.innerHeight, top = fig.getBoundingClientRect().top;
      var p = Math.round(clamp((vh * 0.95 - top) / (vh * 0.5), 0, 1) * 1000) / 1000;
      if (p === last) return;
      last = p;
      fig.style.setProperty("--p", p);
      if (!on) { on = true; fig.classList.add("is-scrub"); }
    }
    function queue() { if (!q) { q = true; requestAnimationFrame(frame); } }
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    frame();
  })();

  /* ------------------------------------------------------------ before the papers: the tea glass
     (ported from ui.js, discs()). The glass fills with discs; their number
     steps up with the scroll as the figure rises into view, and back down
     on the way out, until the visitor takes the slider, which then keeps it. */
  (function discs() {
    var fig = document.getElementById("discs"), range = document.getElementById("discsN");
    if (!fig || !range) return;
    var g = $(".discs__g", fig);
    var out = document.getElementById("discsOut"), sum = document.getElementById("discsSum"), dot = document.getElementById("discsDot");
    var NS = "http://www.w3.org/2000/svg";
    var STEPS = [2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128];
    /* the paper's four parabolas, as [a, b, c, to]; the axis is y = 3.25 and the glass is 9.6 tall */
    var P = [[-0.087, 0.574, 0, 3.4], [-0.089, 0.681, -0.382, 6], [0.146, -2.301, 9.146, 7.5], [0.235, -3.48, 12.926, 9.6]];
    function radius(x) {
      for (var i = 0; i < P.length; i++) if (x <= P[i][3] + 1e-9) return 3.25 - (P[i][0] * x * x + P[i][1] * x + P[i][2]);
      return 0;
    }
    var shown = -1, touched = false;
    function set(k) {
      k = clamp(k, 0, STEPS.length - 1);
      if (k === shown) return;
      shown = k;
      var n = STEPS[k], h = 9.6 / n, v = 0, frag = document.createDocumentFragment();
      for (var i = 1; i <= n; i++) {
        var r = radius(i * h);
        v += Math.PI * r * r * h;
        var rc = document.createElementNS(NS, "rect");
        rc.setAttribute("x", (325 - r * 100).toFixed(1));
        rc.setAttribute("y", ((i - 1) * h * 100).toFixed(1));
        rc.setAttribute("width", (r * 200).toFixed(1));
        rc.setAttribute("height", (h * 100).toFixed(2));
        frag.appendChild(rc);
      }
      g.textContent = "";
      g.appendChild(frag);
      range.value = String(k);
      range.setAttribute("aria-valuetext", n + " discs, " + v.toFixed(1) + " cubic centimetres");
      out.textContent = n;
      sum.textContent = v.toFixed(1);
      /* the scale runs from 150 to 230 ml */
      dot.style.setProperty("--at", (clamp((v - 150) / 80, 0, 1) * 100).toFixed(1) + "%");
    }
    range.addEventListener("input", function () { touched = true; set(parseInt(range.value, 10)); });

    if (still()) return;
    var q = false;
    function frame() {
      q = false;
      if (touched) return;
      var vh = window.innerHeight, top = fig.getBoundingClientRect().top;
      var p = clamp((vh * 0.95 - top) / (vh * 0.6), 0, 1);
      set(Math.round(p * (STEPS.length - 1)));
    }
    function queue() { if (!q) { q = true; requestAnimationFrame(frame); } }
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    frame();
  })();
})();
