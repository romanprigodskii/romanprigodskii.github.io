/* /work/clipwell/: behaviour for this case only.
   - "Written twice": the arrow keys drawn in the figure work. One index drives
     the selection on both sides, so pressing a key on either platform moves
     both. After the figure has been written out it presses the right arrow
     twice by itself, once, so a reader sees that it responds.
   - "Passwords stay out": the schematic runs again each time it comes back
     into view.
   Everything reads correctly without this file. */
(function () {
  "use strict";
  var RP = window.RP;
  if (!RP) return;
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ------------------------------------------------ written twice */
  var tw = document.querySelector("[data-tw]");
  if (tw) (function () {
    var KINDS = ["Text", "Link", "Image", "Text", "File", "Text"];
    var say = tw.querySelector("[data-tw-say]");
    var mac = $$(".tw-d.is-mac .tw-key", tw), win = $$(".tw-d.is-win .tw-key", tw);
    var s = 0, touched = false;

    mac.forEach(function (k) {
      k.setAttribute("role", "button");
      k.setAttribute("tabindex", "0");
      k.setAttribute("aria-label", (k.getAttribute("data-k") === "1" ? "Next item" : "Previous item") + ", on both platforms");
    });
    win.forEach(function (k) { k.setAttribute("aria-hidden", "true"); });
    mac.concat(win).forEach(function (k) { k.setAttribute("data-live", ""); });

    function set(i) {
      s = Math.max(0, Math.min(KINDS.length - 1, i));
      tw.style.setProperty("--s", s);
      if (say && touched) say.textContent = "Item " + (s + 1) + " of " + KINDS.length + ": " + KINDS[s] + ", selected on macOS and on Windows.";
    }
    function press(dir) {
      mac.concat(win).forEach(function (k) {
        if (+k.getAttribute("data-k") !== dir) return;
        k.classList.add("is-down");
        clearTimeout(k.__up);
        k.__up = setTimeout(function () { k.classList.remove("is-down"); }, 150);
      });
      set(s + dir);
    }
    mac.concat(win).forEach(function (k) {
      var dir = +k.getAttribute("data-k");
      k.addEventListener("click", function () { touched = true; press(dir); });
    });
    mac.forEach(function (k) {
      k.addEventListener("keydown", function (ev) {
        var d = 0;
        if (ev.key === "Enter" || ev.key === " ") d = +k.getAttribute("data-k");
        else if (ev.key === "ArrowRight") d = 1;
        else if (ev.key === "ArrowLeft") d = -1;
        else if (ev.key === "Home") { ev.preventDefault(); touched = true; set(0); return; }
        else if (ev.key === "End") { ev.preventDefault(); touched = true; set(KINDS.length - 1); return; }
        if (!d) return;
        ev.preventDefault();
        touched = true;
        press(d);
      });
    });
    set(0);

    // written out station by station as each comes into view; stations that
    // arrive together still go one after another. Once the last is written,
    // the right arrow is pressed twice: the selection walks from the first
    // card to the third on both sides, and the history follows.
    if (RP.still() || !("IntersectionObserver" in window)) return;
    var parts = $$(".tw-heads, .tw-row", tw), last = parts[parts.length - 1], next = 0;
    tw.setAttribute("data-armed", "");
    function demo() {
      setTimeout(function () { if (!touched) press(1); }, 1500);
      setTimeout(function () { if (!touched) press(1); }, 2220);
    }
    var tio = new IntersectionObserver(function (es) {
      es.filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return parts.indexOf(a.target) - parts.indexOf(b.target); })
        .forEach(function (e) {
          tio.unobserve(e.target);
          var now = performance.now(), at = Math.max(now, next);
          next = at + 420;
          setTimeout(function () {
            e.target.classList.add("in");
            if (e.target === last) demo();
          }, at - now);
        });
    }, { rootMargin: "0px 0px -14% 0px", threshold: 0.25 });
    parts.forEach(function (p) { tio.observe(p); });
  })();

  /* ------------------------------------------------ passwords: again on each return */
  var pw = document.querySelector("[data-pw]");
  if (pw && !RP.still() && "IntersectionObserver" in window) {
    pw.setAttribute("data-armed", "");
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        // half of it in view, or most of a short screen given to it
        if (e.intersectionRatio >= 0.5 || (e.intersectionRatio >= 0.3 && e.intersectionRect.height > window.innerHeight * 0.55)) pw.classList.add("in");
        else if (!e.isIntersecting) pw.classList.remove("in");
      });
    }, { threshold: [0, 0.3, 0.5] }).observe(pw);
  }
})();
