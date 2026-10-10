/* prigodskii.dev: from page to page.
   Loaded in the head of every page, ahead of its first frame, because a page
   has to decide how it arrives before that frame is drawn.

   Two ways, by browser:

   - Chrome and the other Chromium browsers but Arc run a cross-document view
     transition (the CSS is in site.css, "from page to page"): the page being
     left fades out over the one arriving, and a project's title flies from
     where it was to where it is going. Only the title the visitor followed
     travels: a title marked data-vt="slug" is given its view-transition-name
     on the way out (pageswap) and on the way in (pagereveal), and only while
     it is on screen.

   - Safari has the same feature, but it blanks the window for several frames
     before it starts (a white flash in the middle of the move). Arc, though
     built on Chromium, does the same: for about 80ms between the two pages
     its window is a flat field of the page's colour, with a view transition,
     with the next page prerendered, and with the pages sent no-store alike
     (Arc 1.165, October 2026). So Safari, Arc and Firefox navigate plainly.
     With a mouse or trackpad, a veil in the page's colour first closes over
     it (html.is-leaving, 170ms) and only then does the page navigate:
     WebKit draws nothing more of a page once a navigation has started, so
     a fade begun with the navigation would never be seen. The next page
     comes up under the veil (html.is-arriving) and the veil lifts from its
     first frame (html.is-lifting). The title the visitor followed
     flies in there as it does in Chrome, from where it was on the page they
     left (stored on the way out) to its place, while the veil lifts around
     it (html.is-flying). On a touch screen the page is left as it is,
     because Safari's preview for swiping back is taken as the navigation
     starts, and a veiled page would make it blank.

   Arc gives no name of its own in its client hints, only Chromium's, which
   tells it from Chrome, Edge, Opera and Brave from the first frame (a plain
   Chromium build, which names nothing else either, takes the veil too).
   Once a page has loaded, Arc also sets --arc-palette-* on the root; the
   first page that sees that remembers it for the next ones.

   A link to a place on another page (the bar's Work, Record and Contact, a
   section of the research page) opens that page on the place itself, not on
   its top with a glide down after: the page is moved there before its first
   frame, and the smooth scrolling of same-page links (html.is-smooth) only
   starts once the page has loaded. */
(function () {
  "use strict";
  var KEY = "rp-vt", LEAVE = "rp-leave", FLY = "rp-fly", ARC = "rp-arc", last = null;
  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  var ua = navigator.userAgentData, arc = false;
  try { arc = localStorage.getItem(ARC) === "1"; } catch (x) {}
  if (!arc && ua && ua.brands && ua.brands.length && (ua.platform === "macOS" || ua.platform === "Windows")) {
    arc = ua.brands.every(function (b) { return b.brand === "Chromium" || /^Not.A.Brand$/i.test(b.brand); });
  }
  if (arc) doc.classList.add("is-arc");
  /* navigator.userAgentData exists only in Chromium */
  var native = !!ua && !arc, opt = null;
  if (native) {
    opt = document.createElement("style");
    opt.textContent = "@view-transition { navigation: auto; }";
    document.head.appendChild(opt);
  }
  function sniff() {
    if (arc || !getComputedStyle(doc).getPropertyValue("--arc-palette-title")) return;
    arc = true;
    native = false;
    doc.classList.add("is-arc");
    if (opt) { opt.remove(); opt = null; }
    try { localStorage.setItem(ARC, "1"); } catch (x) {}
  }
  window.addEventListener("load", function () {
    sniff();
    setTimeout(sniff, 1200);
    requestAnimationFrame(function () { doc.classList.add("is-smooth"); });
  });

  /* ---------------------------------------------- arriving on a place */
  /* followed from another page of the site to a place on this one; not a
     reload or a step back or forward, where the browser puts the page back
     where it was. For a view transition the first frame is held until that
     place is parsed (rel=expect), so the move is made before anything is
     drawn, but for 700ms at most: on a slow line the page then opens on its
     top as before. The veil needs no such hold: it hides the page until the
     move is made. */
  var how = performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
  var spot = null, mark = null;
  /* the browser puts a reloaded page, or one gone back or forward to, where
     it was; it does so as the page is parsed, so the veil waits for that */
  var settle = !!how && how.type !== "navigate";
  var fresh = !how || how.type === "navigate", ref = null;
  try { ref = new URL(document.referrer); } catch (x) {}
  if (fresh && /^#[A-Za-z][\w-]*$/.test(location.hash)) {
    spot = location.hash.slice(1);
    settle = true;
  }
  /* a case page reached through a view transition holds its first frame for
     its title too (it is near the top), so the title followed has somewhere
     to fly to however slowly the page is parsed */
  var until = spot || (/^\/work\/[^\/]+\/$/.test(location.pathname) ? "case-t" : null);
  if (native && fresh && until && ref && ref.origin === location.origin) {
    var ex = document.createElement("link");
    ex.rel = "expect";
    ex.href = "#" + until;
    ex.setAttribute("blocking", "render");
    document.head.appendChild(ex);
    setTimeout(function () { ex.remove(); }, 700);
  }
  /* a title the page opens on, or flies to, is there at once: its own rise
     would move it from under the place the page was put */
  function now(el) {
    var rv = el && el.closest("[data-rv]");
    if (rv) rv.classList.add("in", "is-now");
  }
  /* true once the page stands on its place (or has none to go to) */
  function land() {
    if (!spot) return true;
    var t = document.getElementById(spot);
    if (!t) {
      if (document.readyState === "loading") return false;
      spot = null;
      return true;
    }
    spot = null;
    mark = t;
    now(t);
    t.scrollIntoView({ block: "start", behavior: "instant" });
    return true;
  }
  /* the bar's ground on a page that opens already scrolled, set before the
     frame is drawn rather than faded in after it (site.js keeps it after) */
  function ground() {
    var bar = document.querySelector("[data-bar]");
    if (!bar || bar.classList.contains("is-on")) return;
    var name = document.getElementById("name");
    if (!(name ? name.getBoundingClientRect().bottom < 64 : window.scrollY > 8)) return;
    doc.classList.add("is-snap");
    bar.classList.add("is-on");
    requestAnimationFrame(function () { requestAnimationFrame(function () { doc.classList.remove("is-snap"); }); });
  }
  if (how && how.type !== "navigate") {
    /* the browser puts a reloaded page back where it was with a scroll */
    window.addEventListener("scroll", ground, { once: true, passive: true });
    setTimeout(function () { window.removeEventListener("scroll", ground); }, 1500);
  }
  document.addEventListener("DOMContentLoaded", function () {
    land();
    ground();
    lift();
  });

  /* ---------------------------------------------- Safari, Arc and Firefox */
  var stuck = 0, held = false, hold = 0, drawn = false, late = false;
  var revealing = "onpagereveal" in window;
  /* the title to fly in, from where it was on the page before */
  var fly = null;
  function arrive() {
    var t = 0, f = null;
    try {
      t = +sessionStorage.getItem(LEAVE) || 0;
      f = JSON.parse(sessionStorage.getItem(FLY));
      sessionStorage.removeItem(LEAVE);
      sessionStorage.removeItem(FLY);
    } catch (x) {}
    if (native || reduce.matches || Date.now() - t > 6000) return;
    /* the veil comes up closed and lifts from the first frame drawn: begun in
       the head, half the lift was over before anything was painted */
    clearTimeout(hold);
    doc.classList.remove("is-lifting");
    doc.classList.add("is-arriving");
    held = true;
    late = false;
    fly = f && f.slug && doc.animate ? f : null;
    /* a case title that is to fly in does not rise as well */
    if (fly && fly.slug === slugOf(location.href)) doc.classList.add("vt-flown");
    /* the first frame: pagereveal, or where there is none, the first rAF */
    drawn = false;
    if (!revealing) requestAnimationFrame(function () { drew(); requestAnimationFrame(lift); });
  }
  function drew() {
    if (drawn) return;
    drawn = true;
    /* whatever happens after the first frame, the veil does not stay: on a
       slow line it lifts on what has arrived, and the page still goes to
       its place, at once, when that place is parsed */
    if (held) hold = setTimeout(function () { late = true; lift(); }, 2500);
  }
  function lift() {
    /* not before the first frame, and on an arrival with a place to stand
       on, not before the page has been parsed and laid out by its scripts */
    if (!held || !drawn) return;
    if (!late && settle && document.readyState === "loading") return;
    /* nor, when a title is to fly in, before it has been parsed */
    if (!late && fly && document.readyState === "loading" && !find(fly.slug)) return;
    if (!land() && !late) return;
    /* the scripts may have moved the page under its place since it landed */
    if (mark) mark.scrollIntoView({ block: "start", behavior: "instant" });
    mark = null;
    held = false;
    ground();
    /* the lift is started in a frame of its own: WebKit dates an animation
       begun anywhere else by its last frame, which on a step back can be
       long enough ago for the lift to be over before it is painted */
    requestAnimationFrame(function () {
      if (doc.classList.contains("is-leaving")) return;
      /* the title the visitor followed, if it is on screen here, flies in
         as the veil lifts */
      if (flyIn()) doc.classList.add("is-flying");
      doc.classList.remove("is-arriving");
      doc.classList.add("is-lifting");
      /* once lifted, the veil is taken away altogether */
      clearTimeout(hold);
      hold = setTimeout(function () { doc.classList.remove("is-lifting", "is-flying"); }, 480);
    });
  }
  /* the title the visitor followed flies from where it was on the page they
     left to its place on this one, as it does in Chrome, and the veil lifts
     around it as quickly as the old page fades there. That page is gone by
     then (WebKit stops drawing a page once a navigation starts, and Arc
     empties its window between the two), so the title comes up out of the
     veil as it sets off rather than lifting off the page before. Only the
     title's transform moves and the veil only fades, so nothing is redrawn
     on the way: a view transition within this page did the same, but
     WebKit stalled for a frame as it ended. */
  function flyIn() {
    var f = fly;
    fly = null;
    var el = f ? find(f.slug) : null;
    if (!el) return false;
    var box = el.closest("h1, h2, h3") || el;
    now(el);
    var r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
    var s = f.fs / (parseFloat(getComputedStyle(el).fontSize) || f.fs);
    /* from where it was: its first line's corner at the same place on the
       screen, its type at the size it had there */
    box.style.transformOrigin = (r.left - b.left) + "px " + (r.top - b.top) + "px";
    var a = box.animate([
      { transform: "translate(" + (f.x - r.left) + "px, " + (f.y - r.top) + "px) scale(" + s + ")" },
      { transform: "none" }
    ], { duration: 640, easing: "cubic-bezier(0.32, 0.72, 0, 1)" });
    function done() { box.style.transformOrigin = ""; }
    a.finished.then(done, done);
    return true;
  }
  /* on the way out: the title that will fly in on the next page, and where it
     is now (the next project's title here, or this case page's own) */
  function aim(href) {
    var dest = slugOf(href), mine = own();
    var slug = dest && dest !== mine ? dest : mine;
    var el = slug ? find(slug) : null;
    if (!el) return;
    var r = el.getBoundingClientRect();
    try {
      sessionStorage.setItem(FLY, JSON.stringify({ slug: slug, x: r.left, y: r.top, fs: parseFloat(getComputedStyle(el).fontSize) }));
    } catch (x) {}
  }
  arrive();
  /* a page brought back from the back-forward cache is shown whole again */
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    clearTimeout(stuck);
    doc.classList.remove("is-leaving");
    arrive();
    /* in case this browser has no pagereveal for a page it brings back */
    requestAnimationFrame(function () { requestAnimationFrame(function () { drew(); lift(); }); });
  });
  window.addEventListener("pagehide", function () { clearTimeout(stuck); });
  /* a link to another page of this site, not a file and not a place on this page */
  function page(a) {
    if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return false;
    var u;
    try { u = new URL(a.href); } catch (x) { return false; }
    if (u.origin !== location.origin) return false;
    if (/\.[a-z0-9]+$/i.test(u.pathname) && !/\.html$/i.test(u.pathname)) return false;
    return u.pathname !== location.pathname || u.search !== location.search;
  }
  function leave() {
    try { sessionStorage.setItem(LEAVE, String(Date.now())); } catch (x) {}
    clearTimeout(hold);
    held = false;
    doc.classList.remove("is-arriving", "is-lifting");
    doc.classList.add("is-leaving");
    /* a navigation that never completes (stopped, offline) gives the page back */
    clearTimeout(stuck);
    stuck = setTimeout(function () { doc.classList.remove("is-leaving"); }, 10000);
  }
  /* a step of history within this page (a contents link, the back button
     after one) is not a page change: nothing to veil */
  var moved = false;
  function within() {
    moved = true;
    if (!doc.classList.contains("is-leaving")) return;
    clearTimeout(stuck);
    doc.classList.remove("is-leaving");
  }
  window.addEventListener("hashchange", within);
  window.addEventListener("popstate", within);
  /* stopping the page (Escape) gives it back at once */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !doc.classList.contains("is-leaving")) return;
    clearTimeout(stuck);
    doc.classList.remove("is-leaving");
  });

  function slugOf(href) {
    try {
      var m = /\/work\/([^\/]+)\/?$/.exec(new URL(href, location.href).pathname);
      return m ? m[1] : null;
    } catch (e) { return null; }
  }
  function seen(el) {
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
  }
  function titles() { return document.querySelectorAll("[data-vt]"); }
  function clear() {
    var n = titles();
    for (var i = 0; i < n.length; i++) n[i].style.viewTransitionName = "";
  }
  /* a project's title on this page: on its own case page the big title, on
     any other page the first one on screen */
  function find(slug) {
    var n = titles(), pick = null;
    for (var i = 0; i < n.length; i++) {
      if (n[i].getAttribute("data-vt") !== slug) continue;
      if (n[i].closest(".case-title")) return seen(n[i]) ? n[i] : null;
      if (!pick && seen(n[i])) pick = n[i];
    }
    return pick;
  }
  function own() {
    var t = document.querySelector(".case-title [data-vt]");
    return t ? t.getAttribute("data-vt") : null;
  }

  /* the link being followed (where the browser has the Navigation API, the
     pageswap event names the destination itself) */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    last = a ? { href: a.href, t: Date.now() } : null;
  }, true);

  /* the back button goes back the way the visitor came, to the same place on
     that page, when the step before this one in history is the page it
     points to; otherwise (they landed here, or a contents link has added a
     step within this page since) it is a link */
  function cameFrom(a) {
    var from, to;
    try { from = new URL(document.referrer); to = new URL(a.href); } catch (x) { return false; }
    if (from.origin !== to.origin || from.pathname !== to.pathname || history.length < 2) return false;
    var nav = window.navigation, cur = nav && nav.currentEntry;
    if (cur && typeof cur.index === "number" && cur.index >= 0 && nav.entries) {
      var prev = nav.entries()[cur.index - 1];
      if (!prev || !prev.url) return false;
      try { return new URL(prev.url).pathname === to.pathname; } catch (x) { return false; }
    }
    return !moved;
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    sniff();
    var back = a.hasAttribute("data-back") && cameFrom(a);
    function go() { if (back) history.back(); else location.assign(a.href); }
    if (!native && fine.matches && !reduce.matches && (back || page(a))) {
      e.preventDefault();
      if (doc.classList.contains("is-leaving")) return;
      aim(a.href);
      leave();
      setTimeout(go, 170);
    } else if (back) {
      e.preventDefault();
      go();
    }
  });

  window.addEventListener("pageswap", function (e) {
    clear();
    var slug = null;
    if (e.viewTransition) {
      var to = e.activation && e.activation.entry && e.activation.entry.url;
      if (!to && last && Date.now() - last.t < 4000) to = last.href;
      /* to a project: that project's title here (on a case page, the next-
         project link); anywhere else: this case page's own title */
      var dest = to ? slugOf(to) : null, mine = own();
      slug = dest && dest !== mine ? dest : mine;
      var el = slug ? find(slug) : null;
      if (el) el.style.viewTransitionName = "t-" + slug;
      else slug = null;
    }
    try { sessionStorage.setItem(KEY, JSON.stringify({ slug: slug, t: Date.now() })); } catch (x) {}
  });

  /* the moment before this page's first frame */
  window.addEventListener("pagereveal", function (e) {
    clear();
    land();
    ground();
    drew();
    lift();
    var s = null;
    try { s = JSON.parse(sessionStorage.getItem(KEY)); sessionStorage.removeItem(KEY); } catch (x) {}
    if (!e.viewTransition) return;
    if (s && s.slug && Date.now() - s.t < 8000) {
      var el = find(s.slug);
      if (el) {
        el.style.viewTransitionName = "t-" + s.slug;
        /* a title that arrives through the air skips its own entrance */
        if (el.closest(".case-title")) doc.classList.add("vt-flown");
        now(el);
      }
    }
    e.viewTransition.finished.then(clear, clear);
  });

  /* each page lists the other pages' stylesheets as prefetch links; a
     browser without link prefetch (Safari) gets them here, once this page
     has loaded and settled, as stylesheets for no medium: loaded and kept
     as stylesheets, which the next page can take from the cache (a fetch()
     is kept apart and would not be), and never applied here */
  window.addEventListener("load", function () {
    var l = document.createElement("link");
    if (l.relList && l.relList.supports && l.relList.supports("prefetch")) return;
    setTimeout(function () {
      var n = document.querySelectorAll('link[rel="prefetch"]');
      for (var i = 0; i < n.length; i++) {
        var s = document.createElement("link");
        s.rel = "stylesheet";
        s.media = "not all";
        s.href = n[i].href;
        document.head.appendChild(s);
      }
    }, 1500);
  });

  /* Chromium fetches the next page before it is asked for, so the click has
     nothing left to wait for. The pages a visitor most likely opens next
     (every case page from the home page, the next project from a case
     page) are fetched as the page opens, not when the pointer reaches their
     links: by then the loops are downloading on the same connection, and a
     page queued behind a megabyte of video waits whole seconds on a slow
     line. Any other page of the site is fetched once the pointer comes to
     rest on a link to it (10ms). */
  /* Chromium only (Arc included): where WebKit takes the rules, its arrivals
     drop frames under the fetching */
  if (ua && window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules")) {
    var site = [{ href_matches: "/*" }, { not: { href_matches: "/papers/*" } }, { not: { href_matches: "/assets/*" } }, { not: { href_matches: "/cv.pdf" } }];
    var sr = document.createElement("script");
    sr.type = "speculationrules";
    sr.textContent = JSON.stringify({ prefetch: [
      { source: "document", where: { and: site.concat([{ selector_matches: '.next-a, a.go[href^="work/"]' }]) }, eagerness: "immediate" },
      { source: "document", where: { and: site }, eagerness: "eager" }
    ] });
    document.head.appendChild(sr);
  }
})();
