/* Charts for prigodskii.dev
   Every series here is read from assets/data/audit.json, which is generated
   from the numbers files the two papers were compiled against. Nothing is
   invented for decoration. */
(function (w) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function css(name, node) {
    return getComputedStyle(node || document.body).getPropertyValue(name).trim();
  }
  /* canvas silently falls back to black on a colour it cannot parse, so probe once */
  var probe = document.createElement("canvas").getContext("2d");
  function paintable(colour, fallback) {
    if (!probe) return colour;
    probe.fillStyle = "#010203";
    probe.fillStyle = colour;
    return probe.fillStyle === "#010203" ? fallback : colour;
  }
  function log10(v) { return Math.log(v) / Math.LN10; }
  function clampLog(v, floor) { return Math.max(v == null ? floor : v, floor); }

  /* ---------------------------------------------------------
     1. Hero field. The 84 audit hypotheses as chalk marks.
     --------------------------------------------------------- */
  function heroField(canvas, rows, opts) {
    var ctx = canvas.getContext("2d");
    var raf = null, start = null, reduced = opts.reduced, box = null;

    function draw(progress) {
      var dpr = Math.min(w.devicePixelRatio || 1, 2);
      var cw = canvas.clientWidth, ch = canvas.clientHeight;
      if (!cw || !ch) return;
      var nw = Math.round(cw * dpr), nh = Math.round(ch * dpr);
      if (canvas.width !== nw || canvas.height !== nh) {
        canvas.width = nw;
        canvas.height = nh;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);

      var ink = paintable(css("--ink"), "#f2eee4"),
          accent = paintable(css("--accent"), "#f2703a"),
          rule = paintable(css("--rule"), "#3d4f45");

      // chalkboard ruling
      ctx.save();
      ctx.strokeStyle = rule;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      var step = 88;
      for (var gx = step; gx < cw; gx += step) {
        ctx.beginPath(); ctx.moveTo(Math.round(gx) + 0.5, 0); ctx.lineTo(Math.round(gx) + 0.5, ch); ctx.stroke();
      }
      for (var gy = step; gy < ch; gy += step) {
        ctx.beginPath(); ctx.moveTo(0, Math.round(gy) + 0.5); ctx.lineTo(cw, Math.round(gy) + 0.5); ctx.stroke();
      }
      ctx.restore();

      // plot box, pushed to the right half on wide screens
      var wide = cw > 1000;
      var padL = wide ? cw * 0.47 : cw * 0.09;
      var padR = wide ? cw * 0.05 : cw * 0.09;
      var padT = wide ? ch * 0.16 : ch * 0.12;
      var padB = wide ? ch * 0.20 : ch * 0.14;
      var pw = cw - padL - padR, ph = ch - padT - padB;
      if (pw < 140) { padL = cw * 0.06; padR = cw * 0.06; pw = cw - padL - padR; }

      var xd = [-2, 2.22], yd = [-2, 1.42];
      box = { l: padL, t: padT, w: pw, h: ph, xd: xd, yd: yd };
      function X(v) { return padL + (log10(clampLog(v, 0.01)) - xd[0]) / (xd[1] - xd[0]) * pw; }
      function Y(v) { return padT + ph - (log10(clampLog(v, 0.01)) - yd[0]) / (yd[1] - yd[0]) * ph; }

      // threshold rules
      ctx.save();
      ctx.globalAlpha = 0.30;
      ctx.strokeStyle = accent;
      ctx.setLineDash([5, 6]);
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(X(20), padT); ctx.lineTo(X(20), padT + ph); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padL, Y(20)); ctx.lineTo(padL + pw, Y(20)); ctx.stroke();
      ctx.restore();

      var n = rows.length;
      var shown = reduced ? n : Math.floor(n * Math.min(1, progress));
      for (var i = 0; i < shown; i++) {
        var s = rows[i];
        var r = 2.3 + Math.sqrt(s.n) * 0.16;
        var clears = s.ef >= 20;
        var strong = s.er >= 20;
        ctx.beginPath();
        ctx.arc(X(s.ef), Y(s.er), r, 0, Math.PI * 2);
        if (strong) { ctx.fillStyle = accent; ctx.globalAlpha = 0.85; ctx.fill(); }
        else if (clears) { ctx.strokeStyle = accent; ctx.globalAlpha = 0.72; ctx.lineWidth = 1.6; ctx.stroke(); }
        else { ctx.strokeStyle = ink; ctx.globalAlpha = 0.24; ctx.lineWidth = 1.1; ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
    }

    function tick(ts) {
      if (start == null) start = ts;
      var p = (ts - start) / 2600;
      draw(Math.min(1, p * p * (3 - 2 * p)));
      if (p < 1) raf = w.requestAnimationFrame(tick);
    }

    function run() {
      start = null;
      if (raf) w.cancelAnimationFrame(raf);
      if (reduced) draw(1); else raf = w.requestAnimationFrame(tick);
    }

    /* the inverse of the plot mapping, so a cursor over the field can read out
       the two e-values at the point it is standing on */
    function read(clientX, clientY) {
      if (!box) return null;
      var r = canvas.getBoundingClientRect();
      var x = clientX - r.left, y = clientY - r.top;
      if (x < box.l || x > box.l + box.w || y < box.t || y > box.t + box.h) return null;
      function inv(frac, dom) { return Math.pow(10, dom[0] + frac * (dom[1] - dom[0])); }
      function fmt(v) { return v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(3); }
      return {
        x: fmt(inv((x - box.l) / box.w, box.xd)),
        y: fmt(inv(1 - (y - box.t) / box.h, box.yd))
      };
    }

    return { run: run, redraw: function () { draw(1); }, read: read };
  }

  /* ---------------------------------------------------------
     2. Vertex: model against the closing line
     --------------------------------------------------------- */
  function compareBars(host, v) {
    host.innerHTML = "";
    v.rows.forEach(function (r) {
      var lo = Math.min(r.model, r.market), hi = Math.max(r.model, r.market);
      var base = Math.max(0, lo - (hi - lo) * 2.2 - 0.02);
      var top = hi + (hi - lo) * 0.9 + 0.01;
      /* Each row carries its own truncated axis, because the differences here are
         smaller than any shared axis would show. Rows where a lower score is the
         better one run right to left, so that a longer bar always means better. */
      function pct(x) {
        var f = (x - base) / (top - base);
        if (!r.higher) f = 1 - f;
        return (f * 100).toFixed(2) + "%";
      }
      var left = (r.higher ? base : top).toFixed(3);
      var right = (r.higher ? top : base).toFixed(3);
      var axis = r.higher ? "truncated axis" : "truncated axis, lower is better";

      var row = document.createElement("div");
      row.className = "barrow";
      row.innerHTML =
        '<div class="barrow__m">' + r.metric + "</div>" +
        '<div class="barrow__t">' +
          '<div class="barline barline--b"><span class="barline__track"><span class="barline__fill" data-w="' + pct(r.model) + '"></span></span><span class="barline__v">' + r.model.toFixed(4) + " model</span></div>" +
          '<div class="barline barline--a"><span class="barline__track"><span class="barline__fill" data-w="' + pct(r.market) + '"></span></span><span class="barline__v">' + r.market.toFixed(4) + " line</span></div>" +
          '<div class="barline barline--scale"><span class="barscale"><span>' + left + "</span><span>" + axis + "</span><span>" + right + "</span></span><span class=\"barline__v\"></span></div>" +
        "</div>";
      host.appendChild(row);
    });
  }

  /* ---------------------------------------------------------
     3. The ladder
     --------------------------------------------------------- */
  function ladder(host, d) {
    host.innerHTML = "";
    var W = Math.max(340, Math.min(760, host.clientWidth || 760));
    var narrow = W < 560;
    var H = narrow ? 380 : 360, mL = narrow ? 34 : 46, mR = 12, mT = 24, mB = narrow ? 110 : 96;
    var pw = W - mL - mR, ph = H - mT - mB;
    var max = 34;
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img",
      "aria-label": "Three cumulative charges against a rejection threshold of 20. " +
        d.labels.map(function (l, i) {
          return l.replace(/^\+ /, "Also charged for ") + ": " + d.fair[i] +
            " at fair odds, " + d.real[i] + " after the book's margin";
        }).join(". ") + "." });

    function Y(v) { return mT + ph - (v / max) * ph; }

    [0, 10, 20, 30].forEach(function (t) {
      svg.appendChild(el("line", { x1: mL, x2: mL + pw, y1: Y(t), y2: Y(t), class: t === 20 ? "thr" : "gridline" }));
      svg.appendChild(el("text", { x: mL - 9, y: Y(t) + 4, "text-anchor": "end" }, String(t)));
    });
    svg.appendChild(el("text", { x: mL + pw, y: Y(20) - 9, "text-anchor": "end", class: "lbl-hi" }, narrow ? "e = 20" : "e = 20, the 1/alpha threshold"));

    var slot = pw / d.fair.length;
    var bw = Math.min(64, slot * (narrow ? 0.32 : 0.30));

    d.fair.forEach(function (f, i) {
      var cx = mL + slot * i + slot / 2;
      var r = d.real[i];
      [[f, "fair", -1], [r, "real", 1]].forEach(function (p) {
        var v = p[0], x = cx + p[2] * (bw / 2 + 3) - bw / 2;
        var bar = el("rect", { x: x, y: Y(v), width: bw, height: ph - (Y(v) - mT), rx: 2,
          class: "bar bar--" + p[1] });
        svg.appendChild(bar);
        svg.appendChild(el("text", { x: x + bw / 2, y: Y(v) - 8, "text-anchor": "middle", class: "lbl-hi" }, v.toFixed(2)));
      });
      var words = d.labels[i].split(" ");
      var lines = [], line = "";
      words.forEach(function (word) {
        if ((line + " " + word).trim().length > (narrow ? 13 : 22)) { lines.push(line.trim()); line = word; }
        else line += " " + word;
      });
      lines.push(line.trim());
      lines.forEach(function (t, j) {
        svg.appendChild(el("text", { x: cx, y: mT + ph + 24 + j * 14, "text-anchor": "middle" }, t));
      });
    });

    var lg = el("g", {});
    [["fair", "at fair odds", mL], ["real", narrow ? "after the margin" : "charged the book's margin", mL + (narrow ? 110 : 140)]].forEach(function (p) {
      lg.appendChild(el("rect", { x: p[2], y: H - 18, width: 9, height: 9, class: "bar bar--" + p[0] }));
      lg.appendChild(el("text", { x: p[2] + 15, y: H - 10 }, p[1]));
    });
    svg.appendChild(lg);
    host.appendChild(svg);
  }

  /* ---------------------------------------------------------
     4. The detection floor
     --------------------------------------------------------- */
  function floorChart(host, f) {
    host.innerHTML = "";
    var max = 0.004;
    var items = f.levers.map(function (l) {
      return { name: l.name, v: Math.abs(l.effect), shipped: !!l.shipped };
    }).sort(function (a, b) { return b.v - a.v; });

    var band = document.createElement("span");
    band.className = "floor__band";
    band.innerHTML = '<span class="floor__bandlbl">noise floor, ' + f.mde.toFixed(5) + ' nats</span>';
    host.appendChild(band);

    var list = document.createElement("ul");
    list.className = "floor__rows";
    items.forEach(function (it) {
      var li = document.createElement("li");
      li.className = "floor__row" + (it.shipped ? " is-shipped" : "");
      li.innerHTML =
        '<span class="floor__name">' + it.name + (it.shipped ? ' <b class="floor__pin">shipped</b>' : "") + "</span>" +
        '<span class="floor__track"><span class="floor__fill" data-w="' + (it.v / max * 100).toFixed(2) + '%"></span></span>' +
        '<span class="floor__v">' + it.v.toFixed(5) + "</span>";
      list.appendChild(li);
    });
    host.appendChild(list);

    var scale = document.createElement("div");
    scale.className = "floor__scale";
    scale.innerHTML = "<span>0</span><span>0.001</span><span>0.002</span><span>0.003</span><span>0.004 nats</span>";
    host.appendChild(scale);

    function place() {
      var tracks = list.querySelectorAll(".floor__track");
      if (!tracks.length) return;
      var hostBox = host.getBoundingClientRect();
      var first = tracks[0].getBoundingClientRect();
      var last = tracks[tracks.length - 1].getBoundingClientRect();
      var left = first.left - hostBox.left;
      band.style.left = left + "px";
      band.style.width = (first.width * f.mde / max) + "px";
      band.style.setProperty("--band-h", (last.bottom - first.top) + "px");
      band.style.top = (first.top - hostBox.top) + "px";
      scale.style.marginLeft = left + "px";
      scale.style.width = first.width + "px";
    }
    place();
    if (w.ResizeObserver) new w.ResizeObserver(place).observe(host);
    else w.addEventListener("resize", place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    return { place: place };
  }

  /* ---------------------------------------------------------
     5. The full scatter, explorable. The nearest mark follows the
        pointer, the arrow keys walk the marks in order of wealth, and a
        family can be picked out. What is picked survives a redraw at a
        new width, because it is kept on the host.
     --------------------------------------------------------- */
  var FAMILIES = {
    form_momentum: "Form and momentum",
    style_matchups: "Style matchups",
    physical_durability: "Physical durability",
    market_microstructure: "Market microstructure",
    gap: "Gap",
    experience_pedigree: "Experience and pedigree",
    division_context: "Division context",
    style_and_age: "Style and age",
    activity_layoff: "Activity and layoff"
  };
  var WORDS = { tdd: "takedown defence", ufc: "UFC", elo: "Elo", ko: "KO", womens: "women's", pickem: "pick'em", "4plus": "4+" };
  /* registry slugs read as names: long_layoff_400 is "Long layoff, 400 days" */
  function sliceName(slug) {
    var t = slug.split("_").map(function (x) { return WORDS[x] || x; }).join(" ")
      .replace(/ (\d+)d?$/, ", $1 days");
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function fmtE(v) {
    if (v < 0.01) return "< 0.01";
    if (v < 10) return v.toFixed(2);
    if (v < 100) return v.toFixed(1);
    return Math.round(v).toLocaleString("en-US");
  }
  function verdictOf(p) {
    if (p.er >= 20) return "Clears 20 at fair odds and after the margin, on the most favourable of five seeds: its five-seed median is 12.3. The bar for all 84 at once is 1,680.";
    if (p.ef >= 20) return "Clears 20 at fair odds, then loses it to the book's margin. The bar for all 84 at once is 1,680.";
    if (p.ef >= 1) return "Made money at fair odds, and stopped short of the bar of 20.";
    return "Lost money at fair odds: an e-value below 1 is a bankroll that shrank.";
  }

  function scatter(host, s) {
    var st = host._rp || (host._rp = { fam: null, sel: -1 });
    var rows = s.rows;
    var byWealth = rows.map(function (_, i) { return i; }).sort(function (a, b) { return rows[b].ef - rows[a].ef; });
    if (st.sel < 0) st.sel = byWealth[0];

    host.innerHTML = "";
    var plot = document.createElement("div");
    plot.className = "explore__plot";
    plot.tabIndex = 0;
    plot.setAttribute("role", "group");
    plot.setAttribute("aria-label", "The 84 hypotheses. The arrow keys step through them in order of e-value at fair odds; Escape clears a picked family.");
    var side = document.createElement("div");
    side.className = "explore__side";
    host.appendChild(plot);
    host.appendChild(side);

    var W = Math.max(300, Math.min(780, plot.clientWidth || host.clientWidth || 780));
    var narrow = W < 560;
    var H = Math.round(W * (narrow ? 0.8 : 0.667)), mL = narrow ? 44 : 62, mR = narrow ? 12 : 22, mT = 22, mB = narrow ? 50 : 58;
    var pw = W - mL - mR, ph = H - mT - mB;
    var xd = [-2, 2.25], yd = [-2, 1.45];
    function X(v) { return mL + (log10(clampLog(v, 0.01)) - xd[0]) / (xd[1] - xd[0]) * pw; }
    function Y(v) { return mT + ph - (log10(clampLog(v, 0.01)) - yd[0]) / (yd[1] - yd[0]) * ph; }
    function R(p) { return (narrow ? 2.2 : 2.6) + Math.sqrt(p.n) * (narrow ? 0.12 : 0.17); }

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img",
      "aria-label": "Scatter of all 84 pre-registered hypotheses. The horizontal axis is the e-value at fair odds and the vertical axis the same bet charged the bookmaker's margin, both on a logarithmic scale. Six clear an e-value of 20, which is the threshold for a single pre-specified hypothesis; for a family of 84 the licensed e-BH cutoff is 1,680 and none of them approaches it. One mark sits above 20 after the margin, on the most favourable of five walk-forward seeds." });

    var ticks = [0.01, 0.1, 1, 10, 100];
    ticks.forEach(function (t) {
      svg.appendChild(el("line", { x1: X(t), x2: X(t), y1: mT, y2: mT + ph, class: "gridline" }));
      svg.appendChild(el("text", { x: X(t), y: mT + ph + 18, "text-anchor": "middle" }, t === 0.01 ? "≤0.01" : String(t)));
    });
    [0.01, 0.1, 1, 10].forEach(function (t) {
      svg.appendChild(el("line", { x1: mL, x2: mL + pw, y1: Y(t), y2: Y(t), class: "gridline" }));
      svg.appendChild(el("text", { x: mL - 10, y: Y(t) + 4, "text-anchor": "end" }, t === 0.01 ? "≤0.01" : String(t)));
    });

    svg.appendChild(el("line", { x1: X(20), x2: X(20), y1: mT, y2: mT + ph, class: "thr" }));
    svg.appendChild(el("line", { x1: mL, x2: mL + pw, y1: Y(20), y2: Y(20), class: "thr" }));
    svg.appendChild(el("text", { x: X(20) + 6, y: mT + 12, class: "lbl-hi" }, "e = 20"));
    svg.appendChild(el("text", { x: mL + 6, y: Y(20) - 7, class: "lbl-hi" }, narrow ? "e = 20, margin" : "e = 20 after the margin"));

    svg.appendChild(el("line", { x1: mL, x2: mL + pw, y1: mT + ph, y2: mT + ph, class: "ax" }));
    svg.appendChild(el("line", { x1: mL, x2: mL, y1: mT, y2: mT + ph, class: "ax" }));
    svg.appendChild(el("text", { x: mL + pw, y: H - 10, "text-anchor": "end", class: "lbl-hi" }, "e-value at fair odds"));
    svg.appendChild(el("text", { x: 0, y: 0, "text-anchor": "start", class: "lbl-hi",
      transform: "translate(" + (narrow ? 11 : 16) + "," + (mT + ph) + ") rotate(-90)" }, narrow ? "after the margin" : "e-value after the book's margin"));

    /* the largest samples are drawn first, so a small mark is never buried */
    var groups = [];
    rows.map(function (_, i) { return i; }).sort(function (a, b) { return rows[b].n - rows[a].n; }).forEach(function (idx, k) {
      var p = rows[idx];
      var g = el("g", { class: "dotg" });
      g.appendChild(el("circle", { cx: X(p.ef), cy: Y(p.er), r: R(p),
        class: p.er >= 20 ? "dot dot--won" : (p.ef >= 20 ? "dot dot--near" : "dot"), style: "--i:" + k }));
      svg.appendChild(g);
      groups[idx] = g;
    });

    var probe = el("g", { class: "probe" });
    var hairX = el("line", { class: "hair" }), hairY = el("line", { class: "hair" }), ring = el("circle", { class: "ring" });
    probe.appendChild(hairX); probe.appendChild(hairY); probe.appendChild(ring);
    svg.appendChild(probe);
    plot.appendChild(svg);

    var read = document.createElement("div");
    read.className = "explore__read";
    read.setAttribute("aria-live", "polite");
    side.appendChild(read);

    function num(k, v, hi) { return "<div" + (hi ? ' class="is-hi"' : "") + "><dt>" + k + "</dt><dd>" + v + "</dd></div>"; }
    function select(i) {
      st.sel = i;
      var p = rows[i], x = X(p.ef), y = Y(p.er), r = R(p) + 4;
      ring.setAttribute("cx", x); ring.setAttribute("cy", y); ring.setAttribute("r", r);
      hairX.setAttribute("x1", x); hairX.setAttribute("x2", x); hairX.setAttribute("y1", y + r); hairX.setAttribute("y2", mT + ph);
      hairY.setAttribute("x1", mL); hairY.setAttribute("x2", x - r); hairY.setAttribute("y1", y); hairY.setAttribute("y2", y);
      read.innerHTML = '<p class="read__fam">' + FAMILIES[p.f] + '</p>' +
        '<p class="read__name">' + sliceName(p.s) + '</p>' +
        '<dl class="read__nums">' +
          num("at fair odds", "e = " + fmtE(p.ef), p.ef >= 20) +
          num("after the margin", "e = " + fmtE(p.er), p.er >= 20) +
          num("bouts", p.n.toLocaleString("en-US")) +
          num("rank at fair odds", (byWealth.indexOf(i) + 1) + " of " + rows.length) +
        '</dl><p class="read__verdict">' + verdictOf(p) + '</p>';
    }

    var counts = {};
    rows.forEach(function (p) { counts[p.f] = (counts[p.f] || 0) + 1; });
    var fams = document.createElement("div");
    fams.className = "explore__fams";
    fams.setAttribute("role", "group");
    fams.setAttribute("aria-label", "Pick out one family of hypotheses");
    fams.innerHTML = '<p class="explore__fams-k">The nine families the registry filed them under</p>';
    var chips = Object.keys(FAMILIES).filter(function (f) { return counts[f]; }).map(function (f) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "fam";
      b.innerHTML = FAMILIES[f] + " <i>" + counts[f] + "</i>";
      b.addEventListener("click", function () { setFam(st.fam === f ? null : f); });
      fams.appendChild(b);
      return { f: f, b: b };
    });
    side.appendChild(fams);

    function inFam(i) { return !st.fam || rows[i].f === st.fam; }
    function setFam(f) {
      st.fam = f;
      chips.forEach(function (c) { c.b.setAttribute("aria-pressed", String(c.f === f)); });
      groups.forEach(function (g, i) { g.classList.toggle("is-dim", !inFam(i)); });
      select(inFam(st.sel) ? st.sel : byWealth.filter(inFam)[0]);
    }

    /* the pointer picks the nearest mark, in drawing units, so a small
       circle does not have to be hit exactly */
    function nearest(e, reach) {
      var box = svg.getBoundingClientRect();
      if (!box.width) return -1;
      var k = W / box.width, mx = (e.clientX - box.left) * k, my = (e.clientY - box.top) * k;
      var best = -1, bd = reach * reach;
      rows.forEach(function (p, i) {
        if (!inFam(i)) return;
        var dx = X(p.ef) - mx, dy = Y(p.er) - my, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = i; }
      });
      return best;
    }
    svg.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      var i = nearest(e, 40);
      if (i >= 0 && i !== st.sel) select(i);
    });
    svg.addEventListener("pointerdown", function (e) {
      var i = nearest(e, 60);
      if (i >= 0) select(i);
    });
    plot.addEventListener("keydown", function (e) {
      var list = byWealth.filter(inFam), at = Math.max(0, list.indexOf(st.sel)), k = e.key;
      if (k === "ArrowRight" || k === "ArrowUp") at = Math.max(0, at - 1);
      else if (k === "ArrowLeft" || k === "ArrowDown") at = Math.min(list.length - 1, at + 1);
      else if (k === "Home") at = 0;
      else if (k === "End") at = list.length - 1;
      else if (k === "Escape" && st.fam) { e.preventDefault(); setFam(null); return; }
      else return;
      e.preventDefault();
      select(list[at]);
    });

    setFam(st.fam);
  }

  w.RPCharts = { heroField: heroField, compareBars: compareBars, ladder: ladder, floorChart: floorChart, scatter: scatter };
})(window);
