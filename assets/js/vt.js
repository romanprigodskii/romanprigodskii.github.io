/* prigodskii.dev: from page to page.
   Loaded in the head of every page, ahead of its first frame, because a page
   has to mark the element that travels before that frame is drawn. The move
   itself is CSS (site.css, "from page to page"): the page being left fades
   out over the one arriving, and a project's title flies from where it was
   to where it is going.

   Only the title the visitor followed travels. A title marked data-vt="slug"
   is given its view-transition-name on the way out (pageswap) and on the way
   in (pagereveal), and only while it is on screen. Named in the markup, every
   title on the home page would be captured on every click, and one scrolled
   out of sight would fly in from beyond the edge. */
(function () {
  "use strict";
  var KEY = "rp-vt", last = null;

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
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-back]");
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var from, to;
    try { from = new URL(document.referrer); to = new URL(a.href); } catch (x) { return; }
    if (from.origin === to.origin && from.pathname === to.pathname && history.length > 1) {
      e.preventDefault();
      history.back();
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
