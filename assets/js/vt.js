/* prigodskii.dev: from page to page.
   Loaded in the head of every page, ahead of its first frame, because a page
   has to decide how it arrives before that frame is drawn.

   Two ways, by engine:

   - Chrome and the other Chromium browsers run a cross-document view
     transition (the CSS is in site.css, "from page to page"): the page being
     left fades out over the one arriving, and a project's title flies from
     where it was to where it is going. Only the title the visitor followed
     travels: a title marked data-vt="slug" is given its view-transition-name
     on the way out (pageswap) and on the way in (pagereveal), and only while
     it is on screen.

   - Safari has the same feature, but it blanks the window for several frames
     before it starts (a white flash in the middle of the move). So Safari, and
     Firefox, navigate plainly. With a mouse or trackpad, a veil in the page's
     colour first closes over it under the bar (html.is-leaving, 170ms) and
     only then does the page navigate: WebKit draws nothing more of a page
     once a navigation has started, so a fade begun with the navigation would
     never be seen. On the next page the veil lifts as its entrance plays
     (html.is-arriving). On a touch screen the page is left as it is, because
     Safari's preview for swiping back is taken as the navigation starts, and
     a veiled page would make it blank. */
(function () {
  "use strict";
  var KEY = "rp-vt", LEAVE = "rp-leave", last = null;
  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  /* navigator.userAgentData exists only in Chromium */
  var native = !!navigator.userAgentData;
  if (native) {
    var opt = document.createElement("style");
    opt.textContent = "@view-transition { navigation: auto; }";
    document.head.appendChild(opt);
  }

  /* ---------------------------------------------- Safari and Firefox */
  var stuck = 0, lift = 0;
  function arrive() {
    var t = 0;
    try { t = +sessionStorage.getItem(LEAVE) || 0; sessionStorage.removeItem(LEAVE); } catch (x) {}
    if (native || reduce.matches || Date.now() - t > 6000) return;
    doc.classList.remove("is-arriving");
    void doc.offsetWidth;
    doc.classList.add("is-arriving");
    /* once lifted, the veil is taken away altogether */
    clearTimeout(lift);
    lift = setTimeout(function () { doc.classList.remove("is-arriving"); }, 480);
  }
  arrive();
  /* a page brought back from the back-forward cache is shown whole again */
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    clearTimeout(stuck);
    doc.classList.remove("is-leaving");
    arrive();
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
    clearTimeout(lift);
    doc.classList.remove("is-arriving");
    doc.classList.add("is-leaving");
    /* a navigation that never completes (stopped, offline) gives the page back */
    clearTimeout(stuck);
    stuck = setTimeout(function () { doc.classList.remove("is-leaving"); }, 5000);
  }

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
     that page, when they came from where it points; otherwise it is a link */
  function cameFrom(a) {
    var from, to;
    try { from = new URL(document.referrer); to = new URL(a.href); } catch (x) { return false; }
    return from.origin === to.origin && from.pathname === to.pathname && history.length > 1;
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var back = a.hasAttribute("data-back") && cameFrom(a);
    function go() { if (back) history.back(); else location.assign(a.href); }
    if (!native && fine.matches && !reduce.matches && (back || page(a))) {
      e.preventDefault();
      if (doc.classList.contains("is-leaving")) return;
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

  window.addEventListener("pagereveal", function (e) {
    clear();
    var s = null;
    try { s = JSON.parse(sessionStorage.getItem(KEY)); sessionStorage.removeItem(KEY); } catch (x) {}
    if (!e.viewTransition) return;
    if (s && s.slug && Date.now() - s.t < 8000) {
      var el = find(s.slug);
      if (el) {
        el.style.viewTransitionName = "t-" + s.slug;
        /* the case title arrives through the air, so it skips its own rise */
        if (el.closest(".case-title")) document.documentElement.classList.add("vt-flown");
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

  /* Chrome fetches a page while the pointer rests on a link to it, so the
     click has nothing left to wait for */
  if (window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules")) {
    var sr = document.createElement("script");
    sr.type = "speculationrules";
    sr.textContent = JSON.stringify({ prefetch: [{
      source: "document",
      where: { and: [{ href_matches: "/*" }, { not: { href_matches: "/papers/*" } }, { not: { href_matches: "/assets/*" } }] },
      eagerness: "moderate"
    }] });
    document.head.appendChild(sr);
  }
})();
