/* prigodskii.dev: behaviour.
   Everything here enhances markup that already reads correctly without it:
   the figures are pre-rendered into the HTML (tools/figures.mjs), and with
   JavaScript off or motion reduced every figure sits in its final state. */
(function () {
  "use strict";
  window.__rp = true;
  var F = window.Fig;
  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  function still() { return reduce.matches; }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var base = document.body.getAttribute("data-base") || "";

  /* ------------------------------------------------ easing and a small tween */
  function bezier(x1, y1, x2, y2) {
    function a(p1, p2) { return 1 - 3 * p2 + 3 * p1; }
    function b(p1, p2) { return 3 * p2 - 6 * p1; }
    function c(p1) { return 3 * p1; }
    function at(t, p1, p2) { return ((a(p1, p2) * t + b(p1, p2)) * t + c(p1)) * t; }
    function slope(t, p1, p2) { return 3 * a(p1, p2) * t * t + 2 * b(p1, p2) * t + c(p1); }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 8; i++) {
        var s = slope(t, x1, x2);
        if (Math.abs(s) < 1e-6) break;
        t -= (at(t, x1, x2) - x) / s;
      }
      return at(Math.min(1, Math.max(0, t)), y1, y2);
    };
  }
  var EO = bezier(0.16, 1, 0.3, 1), EIO = bezier(0.77, 0, 0.175, 1);
  function tween(ms, ease, step, done) {
    var t0 = null, stop = false;
    function f(now) {
      if (stop) return;
      if (t0 === null) t0 = now;
      var p = Math.min(1, (now - t0) / ms);
      step(ease(p), p);
      if (p < 1) requestAnimationFrame(f); else if (done) done();
    }
    requestAnimationFrame(f);
    return function () { stop = true; };
  }
  function later(ms, fn) { return setTimeout(fn, ms); }
  /* many marks moving in turn share one frame loop: item i starts
     wait + i * gap ms in, runs ms long, and step(item, eased) draws it */
  function stagger(items, wait, gap, ms, ease, step, done) {
    var st = items.map(function () { return 0; });
    var span = wait + Math.max(0, items.length - 1) * gap + ms;
    return tween(span, function (x) { return x; }, function (e, t) {
      var now = t * span;
      items.forEach(function (it, i) {
        if (st[i] === 2) return;
        var k = (now - wait - i * gap) / ms;
        if (k <= 0) return;
        if (k >= 1) { k = 1; st[i] = 2; } else st[i] = 1;
        step(it, ease(k), i);
      });
    }, done);
  }

  /* ------------------------------------------------ reveal on scroll */
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      reveal(e.target);
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.01 }) : null;
  function reveal(el) {
    function go() { el.classList.add("in"); if (el.__onIn) el.__onIn(); }
    if (el.__ready) el.__ready().then(go); else go();
  }
  /* a stage arrives with its picture: the posters and screenshots on it are
     decoded first (for at most 800ms), so it never rises as an empty panel */
  function pictures(el) {
    var jobs = $$("video[poster]", el).map(function (v) { var i = new Image(); i.src = v.poster; return i; })
      .concat($$("img", el))
      .map(function (i) { return i.decode ? i.decode().catch(function () {}) : null; })
      .filter(Boolean);
    return Promise.race([Promise.all(jobs), new Promise(function (r) { setTimeout(r, 800); })]);
  }
  $$("[data-shot]").forEach(function (el) { el.__ready = function () { return pictures(el); }; });
  function watch(el, fn) {
    if (!el) return;
    if (fn) el.__onIn = fn;
    if (io) io.observe(el); else { el.classList.add("in"); if (fn) fn(); }
  }
  /* a scroll-driven figure listens to the scroll only while it is within a
     screen of the viewport, and reads the layout at most once a frame */
  function whileNear(el, frame) {
    var q = false, dead = false, on = !("IntersectionObserver" in window), near = null;
    function tick() { q = false; if (!dead) frame(); }
    function queue() { if (on && !q && !dead) { q = true; requestAnimationFrame(tick); } }
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    if (!on) {
      near = new IntersectionObserver(function (es) {
        on = es[es.length - 1].isIntersecting;
        if (on) queue();
      }, { rootMargin: "100% 0px 100% 0px" });
      near.observe(el);
    }
    frame();
    return function () {
      dead = true;
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      if (near) near.disconnect();
    };
  }
  /* the hero is the first view: its items arrive on load, in their --d order,
     not when the observer's trimmed margin happens to reach them (at 1280x720
     the rule's tile sits under that margin) */
  var heroRv = $$(".hero [data-rv]");
  if (heroRv.length) requestAnimationFrame(function () {
    requestAnimationFrame(function () { heroRv.forEach(function (el) { el.classList.add("in"); }); });
  });
  $$("[data-rv], .edge, .sec-t, [data-shot], .ar-strip, .gl-phones, [data-fl], [data-lv], [data-zk], .thesis, .vs, .contact, [data-watch]").forEach(function (el) { watch(el); });
  $$(".vs td.is-won").forEach(function (td, i) { td.style.setProperty("--r", i); });

  /* a figure with an endless animation ([data-loop]) holds it while it is
     off screen, so a page left open does not keep redrawing it */
  if (io) {
    var lio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle("is-away", !e.isIntersecting); });
    });
    $$("[data-loop]").forEach(function (el) { lio.observe(el); });
  }

  /* ------------------------------------------------ the bar */
  /* the bar takes its ground once the name has gone up under it; an observer
     reports that crossing, so scrolling itself costs nothing here */
  var bar = $("[data-bar]"), nameEl = $("#name");
  if (bar && nameEl && io) {
    new IntersectionObserver(function (es) {
      var e = es[es.length - 1];
      bar.classList.toggle("is-on", !e.isIntersecting && e.boundingClientRect.bottom < 64);
    }, { rootMargin: "-64px 0px 0px 0px" }).observe(nameEl);
  } else if (bar && io) {
    /* without the name, the bar is on once the page has moved 8px: a marker
       over the page's first 8px leaves the viewport at that point */
    var mark = document.createElement("div");
    mark.setAttribute("aria-hidden", "true");
    mark.style.cssText = "position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none;visibility:hidden";
    document.body.appendChild(mark);
    new IntersectionObserver(function (es) {
      bar.classList.toggle("is-on", !es[es.length - 1].isIntersecting);
    }).observe(mark);
  } else if (bar) {
    var barOn = null;
    var onScrollBar = function () {
      var on = nameEl ? nameEl.getBoundingClientRect().bottom < 64 : window.scrollY > 8;
      if (on !== barOn) { barOn = on; bar.classList.toggle("is-on", on); }
    };
    window.addEventListener("scroll", onScrollBar, { passive: true });
    onScrollBar();
  }
  var navLinks = $$(".bar-nav a[href^='#']");
  if (navLinks.length && io) {
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) {
          if (a.getAttribute("href") === "#" + e.target.id) a.setAttribute("aria-current", "location");
          else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("section[id]").forEach(function (s) { spy.observe(s); });
  }

  /* ------------------------------------------------ the slide rule */
  var body = $("[data-rule-body]");
  if (body && F) (function () {
    var slide = $("[data-slide]"), cur = $("[data-cursor]");
    /* the handle is inert in the markup; it becomes a slider only here */
    cur.removeAttribute("aria-hidden");
    cur.setAttribute("role", "slider");
    cur.tabIndex = 0;
    cur.setAttribute("aria-label", "Hypotheses tested at once");
    cur.setAttribute("aria-valuemin", "1");
    cur.setAttribute("aria-valuemax", "84");
    var roK = $("[data-ro-k]"), roD = $("[data-ro-d]"), roA = $("[data-ro-a]");
    var D20 = F.dx(20), SLIDE_W = F.dx(84);
    var st = { k: 84, pos: 1, stop: null, busy: false };
    function setSlide(a) { slide.style.transform = "translateX(" + (F.dx(a) / SLIDE_W * 100) + "%)"; }
    function setCursor(f) {
      cur.style.setProperty("--cx", (f * 100) + "%");
      st.pos = f;
      if (f > 0.985) body.setAttribute("data-at-end", ""); else body.removeAttribute("data-at-end");
    }
    function show(a, k) { roA.textContent = F.fmtInt(a); roK.textContent = F.fmtInt(k); roD.textContent = F.fmtInt(a * k); }
    function kToFrac(k) { return F.dx(20 * k); }
    function fracToK(f) { return Math.pow(10, f * Math.log(1680) / Math.LN10) / 20; }
    function setK(k, animate) {
      k = Math.max(1, Math.min(84, Math.round(k)));
      st.k = k;
      cur.setAttribute("aria-valuenow", k);
      cur.setAttribute("aria-valuetext", "20 times " + k + " is " + F.fmtInt(20 * k) + (k === 1 ? ": the bar for one hypothesis" : ": the bar for " + k + " hypotheses at once"));
      show(20, k);
      var to = kToFrac(k);
      if (st.stop) st.stop();
      if (!animate || still()) { setCursor(to); return; }
      var from = st.pos;
      st.stop = tween(180, EO, function (e) { setCursor(from + (to - from) * e); });
    }
    function intro() {
      if (still()) return;
      st.busy = true;
      var h = st.intro = [];
      setSlide(1); setCursor(0); show(1, 1);
      h.push(later(900, function () {
        h.push(tween(820, EIO, function (e) {
          var a = Math.pow(20, e);
          setSlide(a); setCursor(F.dx(a)); show(Math.round(a), 1);
        }, function () {
          h.push(later(140, function () {
            h.push(tween(1000, EIO, function (e) {
              var f = D20 + (1 - D20) * e;
              setCursor(f);
              show(20, Math.max(1, Math.round(fracToK(f))));
            }, function () { st.busy = false; setK(84, false); }));
          }));
        }));
      }));
    }
    /* a visitor who reaches for the rule while it is still setting itself takes it over */
    function skipIntro() {
      if (!st.busy) return;
      (st.intro || []).forEach(function (x) { if (typeof x === "function") x(); else clearTimeout(x); });
      st.busy = false;
      setSlide(20);
      setK(84, false);
    }
    cur.addEventListener("focus", skipIntro);
    function kFromEvent(ev) {
      var r = body.getBoundingClientRect();
      return fracToK(Math.max(D20, Math.min(1, (ev.clientX - r.left) / r.width)));
    }
    var dragging = false;
    body.addEventListener("pointerdown", function (ev) {
      if (ev.button !== 0) return;
      skipIntro();
      dragging = true;
      cur.classList.add("is-drag");
      try { body.setPointerCapture(ev.pointerId); } catch (e) {}
      setK(kFromEvent(ev), true);
    });
    body.addEventListener("pointermove", function (ev) {
      if (!dragging) return;
      var k = Math.round(kFromEvent(ev));
      if (k !== st.k) setK(k, true);
    });
    function endDrag() { dragging = false; cur.classList.remove("is-drag"); }
    body.addEventListener("pointerup", endDrag);
    body.addEventListener("pointercancel", endDrag);
    cur.addEventListener("keydown", function (ev) {
      skipIntro();
      var k = st.k, map = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 };
      if (ev.key in map) k += map[ev.key];
      else if (ev.key === "Home") k = 1;
      else if (ev.key === "End") k = 84;
      else return;
      ev.preventDefault();
      setK(k, false);
    });
    setK(84, false);
    intro();
  })();

  /* ------------------------------------------------ Vertex MMA: the AUC needle */
  var auc = $("[data-auc]");
  if (auc) {
    var needle = $("[data-auc-needle]", auc), aucV = $("[data-auc-v]", auc);
    var P = parseFloat(needle.style.getPropertyValue("--p")) || 44.88;
    if (!still()) { needle.style.setProperty("--p", "0%"); aucV.textContent = "0.5000"; }
    watch(auc, function () {
      if (still()) return;
      tween(1700, EO, function (e) {
        needle.style.setProperty("--p", (P * e) + "%");
        aucV.textContent = (0.5 + (0.7244 - 0.5) * e).toFixed(4);
      });
    });
  }

  /* ------------------------------------------------ Vertex Boxing: four needles against the bar */
  var wg = $("[data-wg]");
  if (wg && F) (function () {
    var needles = [];
    function prep() {
      needles = $$(".wg-needle", wg).map(function (n) {
        var svg = n.ownerSVGElement, W = svg.getBoundingClientRect().width;
        var f = parseFloat(n.getAttribute("data-f")), e = parseFloat(n.getAttribute("data-e"));
        var g1 = svg.querySelector(".wg-g.g1"), gb = svg.querySelector(".wg-bar");
        var x0 = (g1 ? parseFloat(g1.getAttribute("x1")) / 100 : F.gaugeX(1, W)) * W, x = f * W;
        var xbar = (gb ? parseFloat(gb.getAttribute("x1")) / 100 : F.gaugeX(20, W)) * W;
        var g = n.querySelector(".wg-ng");
        g.setAttribute("transform", "translate(" + (x0 - x) + ",0)");
        n.classList.remove("is-hit");
        return { n: n, g: g, x0: x0, x: x, xbar: xbar, hit: e >= 20 };
      });
    }
    if (still()) return;
    prep();
    watch(wg, function () {
      needles.forEach(function (o, i) {
        later(i * 150, function () {
          tween(1500, EO, function (e) {
            var x = o.x0 + (o.x - o.x0) * e;
            o.g.setAttribute("transform", "translate(" + (x - o.x) + ",0)");
            if (o.hit && x >= o.xbar - 0.5) o.n.classList.add("is-hit");
          });
        });
      });
    });
  })();

  /* ------------------------------------------------ videos play only while they are seen,
     and every loop can be paused: one round button in the bottom-right corner of its
     media, or one for a whole group of loops on one stage ([data-play-group]). A loop
     the visitor pauses stays paused ("held") until they play it again. */
  var GLYPH = '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">' +
    '<rect class="vt-pause" x="2" y="1.5" width="2.75" height="9" rx="0.6"/><rect class="vt-pause" x="7.25" y="1.5" width="2.75" height="9" rx="0.6"/>' +
    '<path class="vt-play" d="M3.25 1.9v8.2c0 .5.55.8.97.54l6.5-4.1a.64.64 0 0 0 0-1.08l-6.5-4.1a.64.64 0 0 0-.97.54z"/></svg>';
  /* what the button controls: data-title, or the first clause of the video's own label */
  function vidTitle(el) {
    var t = el.getAttribute("data-title");
    if (!t) {
      t = (el.getAttribute("aria-label") || "").split(/[,:;.](?:\s|$)/)[0].trim();
      if (t.length > 52) t = t.slice(0, 52).replace(/\s+\S*$/, "");
      t = t.replace(/^(The|A|An) /, function (m) { return m.toLowerCase(); });
    }
    return t || "the recording";
  }
  function vidPlay(v) {
    if (v.preload !== "auto") v.preload = "auto";
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }
  $$("video[data-play]").forEach(function (v) {
    if (v.__vt) return;
    var grp = v.closest("[data-play-group]");
    var vs = grp ? $$("video[data-play]", grp) : [v];
    var b = document.createElement("button"), title = vidTitle(grp || v);
    b.type = "button";
    b.className = "vid-toggle";
    b.innerHTML = GLYPH;
    function held() { return vs.every(function (x) { return x.dataset.held === "1"; }); }
    function sync() {
      var h = held();
      b.classList.toggle("is-held", h);
      b.setAttribute("aria-label", (h ? "Play " : "Pause ") + title);
    }
    function toggle() {
      var h = !held();
      vs.forEach(function (x) {
        x.dataset.held = h ? "1" : "";
        if (h) x.pause();
        else { x.__asked = true; if (x.__seen || !io) vidPlay(x); }
      });
      sync();
    }
    vs.forEach(function (x) {
      x.__vt = sync;
      x.dataset.held = still() ? "1" : "";
      x.addEventListener("click", toggle);
      /* a loop set playing by another script is no longer held */
      x.addEventListener("play", function () { if (x.dataset.held && !x.paused) x.dataset.held = ""; sync(); });
      x.addEventListener("pause", sync);
    });
    sync();
    if (grp) grp.appendChild(b);
    else v.insertAdjacentElement("afterend", b);
    b.addEventListener("click", toggle);
  });
  if (io) {
    var vio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        v.__seen = e.isIntersecting;
        if (e.isIntersecting && !v.dataset.held && (!still() || v.__asked)) vidPlay(v);
        else if (!v.paused) v.pause();
      });
    }, { threshold: 0.25 });
    /* a loop starts loading a screen before it arrives, so it is already
       running when it scrolls in rather than holding on its poster */
    var vnear = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (!e.isIntersecting || (still() && !v.__asked) || v.dataset.held) return;
        if (v.preload !== "auto") v.preload = "auto";
        vnear.unobserve(v);
      });
    }, { rootMargin: "100% 0px 100% 0px" });
    $$("video[data-play]").forEach(function (v) { vio.observe(v); vnear.observe(v); });
  }

  /* ------------------------------------------------ an index that follows a loop
     (Alfa-Romeo's screens, the Vertex MMA bout). The item on show fills as the
     recording runs through it. The fill is one browser animation per item,
     started where the recording is, so nothing is redrawn from script between
     items: follow() calls paint() only when the item changes or the loop
     plays, pauses, stalls or seeks. paint() draws and returns the seconds
     until the next item takes over. The item's ::after is the fill; its CSS
     gives the axis (--fill-axis: x, otherwise y). */
  var fillOK = (function () {
    try { return typeof KeyframeEffect === "function" && "pseudoElement" in KeyframeEffect.prototype; } catch (e) { return false; }
  })();
  function running(v) { return !v.paused && v.readyState > 2; }
  function fill(li, p, secs, run) {
    p = Math.min(1, Math.max(0, p || 0));
    if (li.__fill) { li.__fill.cancel(); li.__fill = null; }
    li.style.setProperty("--p", p.toFixed(4));
    if (!fillOK || !run || !(secs > 0) || p >= 1) return;
    var ax = getComputedStyle(li).getPropertyValue("--fill-axis").trim() === "x" ? "X" : "Y";
    li.__fill = li.animate([{ transform: "scale" + ax + "(0)" }, { transform: "scale" + ax + "(1)" }],
      { pseudoElement: "::after", duration: secs * 1000, fill: "forwards", easing: "linear" });
    li.__fill.currentTime = p * secs * 1000;
  }
  function follow(v, paint) {
    var timer = 0, raf = 0;
    function tick() {
      clearTimeout(timer);
      timer = 0;
      var left = paint();
      if (!running(v)) return;
      /* without pseudo-element animations the fill is drawn every frame, as before */
      if (!fillOK) { if (!raf) raf = requestAnimationFrame(function () { raf = 0; tick(); }); return; }
      if (left > 0) timer = setTimeout(tick, Math.max(16, left * 1000 / (v.playbackRate || 1) + 20));
    }
    ["play", "playing", "pause", "waiting", "seeked", "ratechange", "loadeddata"].forEach(function (e) { v.addEventListener(e, tick); });
    return tick;
  }

  /* ------------------------------------------------ copying */
  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () {});
  }
  $$("[data-copy-cmd]").forEach(function (btn) {
    var code = btn.parentElement.querySelector("code");
    if (!navigator.clipboard) return;
    btn.hidden = false;
    btn.addEventListener("click", function () {
      copyText(code.textContent.trim(), function () {
        btn.textContent = "Copied";
        later(1600, function () { btn.textContent = "Copy"; });
      });
    });
  });
  $$("[data-copy-mail]").forEach(function (a) {
    var flag = a.parentElement.querySelector(".copied");
    a.addEventListener("click", function () {
      copyText(a.getAttribute("data-copy-mail"), function () {
        if (!flag) return;
        flag.textContent = "Copied";
        flag.classList.add("is-on");
        later(2200, function () {
          flag.classList.remove("is-on");
          later(340, function () { if (!flag.classList.contains("is-on")) flag.textContent = ""; });
        });
      });
    });
  });

  /* ------------------------------------------------ the record: a chart-recorder pen crosses the years */
  var rec = $("[data-rec]"), pen = $("[data-rec-pen]");
  if (rec && pen) {
    var entries = $$(".rec-e", rec), recMax = 0, recW = -1, recLeft = [], recX = -1, stopRec = null;
    var recFrame = function () {
      if (window.innerWidth <= 760 || still()) { entries.forEach(function (e) { e.classList.add("is-inked"); }); return; }
      var r = rec.getBoundingClientRect(), vh = window.innerHeight;
      /* the entries' places are read once per width, not on every frame */
      if (r.width !== recW) { recW = r.width; recLeft = entries.map(function (e) { return e.offsetLeft; }); }
      /* the pen starts as the Record's top enters and has crossed every year
         by the time that top is 60% of the way down the screen */
      var p = Math.max(recMax, Math.min(1, (vh - r.top) / (vh * 0.4)));
      recMax = p;
      var W = r.width, x0 = W * 0.191377, x = x0 + (W - x0) * p;
      if (x === recX) return;
      recX = x;
      pen.style.setProperty("--pen", x + "px");
      entries.forEach(function (e, i) { e.classList.toggle("is-inked", recLeft[i] <= x - 2 || p >= 1); });
      rec.classList.toggle("is-done", p >= 1);
      /* it never unwrites, so once every year is inked it stops listening */
      if (p >= 1 && stopRec) { stopRec(); stopRec = null; }
    };
    stopRec = whileNear(rec, recFrame);
    if (recMax >= 1) stopRec();
  }

  /* ------------------------------------------------ the 84 on the page's own axis */
  var FAM = { form_momentum: "Form and momentum", style_matchups: "Style matchups", physical_durability: "Physical durability", market_microstructure: "Market microstructure", gap: "Gap", experience_pedigree: "Experience and pedigree", division_context: "Division context", style_and_age: "Style and age", activity_layoff: "Activity and layoff" };
  var WORDS = { tdd: "takedown defence", ufc: "UFC", elo: "Elo", ko: "KO", womens: "women's", pickem: "pick'em", "4plus": "4+" };
  function sliceName(s) {
    var t = s.split("_").map(function (x) { return WORDS[x] || x; }).join(" ").replace(/ (\d+)d?$/, ", $1 days");
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  window.RP = { FAM: FAM, sliceName: sliceName, tween: tween, EO: EO, EIO: EIO, still: still, watch: watch, whileNear: whileNear, stagger: stagger, fill: fill, follow: follow, running: running };
  var audit = null;
  function loadAudit() {
    if (audit) return Promise.resolve(audit);
    return fetch(base + "assets/data/audit.json").then(function (r) { return r.json(); }).then(function (d) { audit = d; return d; });
  }
  window.RP.loadAudit = loadAudit;

  var vd = $("[data-vd]");
  if (vd && F && window.fetch) (function () {
    var plot = $("[data-vd-plot]", vd), tip = $("[data-vd-tip]", vd), say = $("[data-vd-say]", vd), ctl = $("[data-vd-ctl]", vd);
    var V = { key: "ef", bar: 20, rows: null, W: 0, on: -1, pos: {}, stop: null };
    var SAY = {
      "ef-20": "At fair odds, six of the 84 clear 20, the bar for one hypothesis.",
      "er-20": "After the bookmaker’s margin, one clears 20, and only on its most favourable seed.",
      "ef-1680": "Held to 1,680, the bar for all 84 at once, none of them clears. The best stops at 151.",
      "er-1680": "After the margin and held to 1,680, nothing comes close. The best stops at 21."
    };
    function render() {
      var W = plot.getBoundingClientRect().width;
      if (!W || !V.rows) return;
      V.W = W;
      plot.innerHTML = F.verdict(V.rows, W, V.key, { bar: V.bar });
      V.pos = {};
      $$(".vd-dot", plot).forEach(function (c) {
        V.pos[+c.getAttribute("data-i")] = { x: +c.getAttribute("cx"), y: +c.getAttribute("cy"), el: c };
      });
      bind();
    }
    function layoutFor(key) {
      var svg = $("svg", plot), y0 = +svg.getAttribute("data-y0");
      var lay = F.verdictLayout(V.rows, key, V.W), out = {};
      lay.pts.forEach(function (p) { out[p.i] = { x: p.x, y: y0 - lay.r - 1.5 - p.lv * lay.d, off: p.off }; });
      return out;
    }
    function sayNow() { say.textContent = SAY[V.key + "-" + V.bar]; }
    function press(group, val) {
      $$(".seg-b[data-" + group + "]", vd).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-" + group) === String(val) ? "true" : "false"); });
    }
    function setKey(key) {
      if (key === V.key) return;
      V.key = key;
      press("key", key);
      sayNow();
      pick(-1);
      var to = layoutFor(key), from = {};
      Object.keys(V.pos).forEach(function (i) { from[i] = { x: V.pos[i].x, y: V.pos[i].y }; });
      if (V.stop) V.stop();
      var xbar = F.gx(V.bar) * V.W;
      function apply(e) {
        Object.keys(V.pos).forEach(function (i) {
          var p = V.pos[i], a = from[i], b = to[i];
          if (!b) return;
          p.x = a.x + (b.x - a.x) * e; p.y = a.y + (b.y - a.y) * e;
          p.el.setAttribute("cx", p.x.toFixed(2)); p.el.setAttribute("cy", p.y.toFixed(2));
          p.el.classList.toggle("is-hit", p.x >= xbar - 0.5);
          p.el.classList.toggle("is-off", !!b.off && e === 1);
        });
      }
      if (still()) { apply(1); render(); return; }
      V.stop = tween(1100, EIO, apply, function () { render(); });
    }
    function setBar(v) {
      if (v === V.bar) return;
      var from = V.bar;
      V.bar = v;
      press("bar", v);
      sayNow();
      pick(-1);
      var line = $("[data-vd-bar]", plot), cap = $("[data-vd-barcap]", plot);
      if (cap) cap.textContent = "";
      var x0 = F.gx(from), x1 = F.gx(v);
      function apply(e) {
        var x = (x0 + (x1 - x0) * e) * V.W;
        line.setAttribute("x1", x.toFixed(2)); line.setAttribute("x2", x.toFixed(2));
        Object.keys(V.pos).forEach(function (i) { V.pos[i].el.classList.toggle("is-hit", V.pos[i].x >= x - 0.5 && V.rows[i][V.key] >= 20); });
      }
      if (still()) { render(); return; }
      if (V.stop) V.stop();
      V.stop = tween(1300, EIO, apply, function () { render(); });
    }
    function drop() {
      if (still()) return;
      /* one frame loop moves all 84, each starting 14ms after its left neighbour */
      var ids = Object.keys(V.pos).sort(function (a, b) { return V.pos[a].x - V.pos[b].x; });
      var ds = ids.map(function (i) {
        var p = V.pos[i];
        p.el.setAttribute("cy", p.y - 90);
        p.el.style.opacity = "0";
        return { el: p.el, y1: p.y, shown: false };
      });
      stagger(ds, 0, 14, 900, EO, function (d, e) {
        if (!d.shown) { d.shown = true; d.el.style.opacity = ""; }
        d.el.setAttribute("cy", (d.y1 - 90 + 90 * e).toFixed(2));
      });
    }
    function bind() {
      var svg = $("svg", plot);
      svg.setAttribute("tabindex", "0");
      function nearest(ev) {
        var r = svg.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top, best = -1, bd = 22 * 22;
        Object.keys(V.pos).forEach(function (i) {
          var p = V.pos[i], dx = p.x - x, dy = p.y - y, d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = +i; }
        });
        return best;
      }
      svg.addEventListener("pointermove", function (ev) { if (ev.pointerType !== "touch") pick(nearest(ev)); });
      svg.addEventListener("pointerleave", function () { pick(-1); });
      svg.addEventListener("pointerdown", function (ev) { pick(nearest(ev)); });
      svg.addEventListener("keydown", function (ev) {
        var order = Object.keys(V.pos).map(Number).sort(function (a, b) { return V.rows[a][V.key] - V.rows[b][V.key]; });
        var at = order.indexOf(V.on);
        if (ev.key === "ArrowRight" || ev.key === "ArrowUp") { pick(order[Math.min(order.length - 1, at + 1)]); ev.preventDefault(); }
        else if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") { pick(order[Math.max(0, at < 0 ? order.length - 1 : at - 1)]); ev.preventDefault(); }
        else if (ev.key === "Escape") pick(-1);
      });
      svg.addEventListener("blur", function () { pick(-1); });
    }
    function pick(i) {
      if (i === V.on) return;
      var g = $(".vd-dots", plot);
      if (V.on >= 0 && V.pos[V.on]) V.pos[V.on].el.classList.remove("is-on");
      V.on = i;
      if (i < 0 || !V.pos[i]) { tip.hidden = true; if (g) g.classList.remove("has-on"); return; }
      var p = V.pos[i], row = V.rows[i];
      p.el.classList.add("is-on");
      g.classList.add("has-on");
      g.appendChild(p.el);
      tip.hidden = false;
      tip.innerHTML = "<b>" + sliceName(row.s) + "</b><span class=\"t-fam\">" + FAM[row.f] + ", " + F.fmtInt(row.n) + " bouts</span>" +
        "<span class=\"t-e\">e = " + F.fmtE(row.ef) + " at fair odds, " + F.fmtE(row.er) + " after the margin</span>";
      tip.hidden = false;
      var pr = plot.getBoundingClientRect(), vr = vd.getBoundingClientRect();
      var left = pr.left - vr.left + p.x, top = pr.top - vr.top + p.y;
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      tip.style.left = Math.max(-8, Math.min(vr.width - tw + 8, left - tw / 2)) + "px";
      tip.style.top = (top - th - 14) + "px";
    }
    loadAudit().then(function (d) {
      V.rows = d.segments.rows;
      if (ctl) ctl.hidden = false;
      render();
      $$(".seg-b[data-key]", vd).forEach(function (b) { b.addEventListener("click", function () { setKey(b.getAttribute("data-key")); }); });
      $$(".seg-b[data-bar]", vd).forEach(function (b) { b.addEventListener("click", function () { setBar(+b.getAttribute("data-bar")); }); });
      if (!still()) $$(".vd-dot", plot).forEach(function (c) { c.style.opacity = "0"; });
      watch(vd, function () { $$(".vd-dot", plot).forEach(function (c) { c.style.opacity = ""; }); drop(); });
      var rt = null, lastW = V.W;
      window.addEventListener("resize", function () {
        clearTimeout(rt);
        rt = setTimeout(function () {
          var w = plot.getBoundingClientRect().width;
          if (Math.abs(w - lastW) < 2) return;
          lastW = w; pick(-1); render();
        }, 160);
      });
    }).catch(function () {
      /* without the data the switches never appear, so their kept room goes too */
      if (ctl) ctl.style.display = "none";
      vd.classList.add("in");
    });
  })();

  /* ------------------------------------------------ floor plate: what each mark is */
  $$("[data-fl]").forEach(function (fl) {
    var ftip = $("[data-fl-tip]", fl);
    if (!ftip) return;
    function show(m) {
      ftip.textContent = m.getAttribute("data-tip");
      ftip.hidden = false;
      var r = m.getBoundingClientRect(), fr = fl.getBoundingClientRect();
      ftip.style.left = Math.max(0, Math.min(fr.width - ftip.offsetWidth, r.left - fr.left + r.width / 2 - ftip.offsetWidth / 2)) + "px";
      ftip.style.top = (r.top - fr.top - ftip.offsetHeight - 10) + "px";
    }
    fl.addEventListener("pointerover", function (ev) {
      var m = ev.target.closest && ev.target.closest("[data-tip]");
      if (m) show(m);
    });
    fl.addEventListener("pointerout", function (ev) {
      var m = ev.target.closest && ev.target.closest("[data-tip]");
      if (m) ftip.hidden = true;
    });
    $$(".fl-svg", fl).forEach(function (svg) {
      svg.setAttribute("tabindex", "0");
      var at = -1, marks = null;
      function list() {
        return marks || (marks = $$("[data-tip]", svg).sort(function (a, b) { return a.getBoundingClientRect().left - b.getBoundingClientRect().left; }));
      }
      svg.addEventListener("keydown", function (ev) {
        var m = list();
        if (ev.key === "ArrowRight" || ev.key === "ArrowUp") at = Math.min(m.length - 1, at + 1);
        else if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") at = at < 0 ? m.length - 1 : Math.max(0, at - 1);
        else if (ev.key === "Escape") { at = -1; ftip.hidden = true; return; }
        else return;
        ev.preventDefault();
        show(m[at]);
      });
      svg.addEventListener("blur", function () { at = -1; ftip.hidden = true; });
      window.addEventListener("resize", function () { marks = null; });
    });
  });

})();
