# Design notes

## The scene

An admissions reader or a workshop statistician on a laptop in a bright
office, the Gluline App Store page open in the next tab, twenty portfolios
queued. The site has to sit beside Apple's own pages without looking a decade
older, and the products have to be seen working, not described.

So the ground is a cool near-white page with near-black type, the data sits on
neutral tiles, and each product stands on a stage tinted from its own palette,
shown as a muted looping recording of the real thing.

## Colour

| token | value | use |
|---|---|---|
| `--bg` | #FBFCFE | the page |
| `--tile` | #F3F5F7 | figure tiles, the slide rule |
| `--tile-2` | a step darker | tracks inside tiles |
| `--ink` | #13161C | type, marks, bars (17.7:1) |
| `--ink-2` | #4C5058 | secondary text (7.9:1) |
| `--ink-3` | #686C73 | tertiary text (5.2:1 on the page, 4.8:1 on a tile) |
| `--line`, `--line-2` | hairlines | rules between rows |
| `--signal` | oklch(0.57 0.2 255) | a result that clears its bar, and nothing else |
| `--signal-t` | oklch(0.51 0.2 257) | the same, as text (5.5:1) |

Blue never decorates. If a mark is blue, it cleared 20 (or whatever bar the
figure states). The model beating nobody is drawn in ink.

The stages (`.stage.is-dark`, `.is-teal`, `.is-red`, `.is-sage`, `.is-paper`)
take their colour from the product on them: Vertex's dark web app, Gluline's
teal, the bank's red, Clipwell's desktop, the warm paper indelible prints on.
Each is one hue, muted and lit from above, so the screens standing on it
keep their own colours.
They are the only coloured surfaces on the site.

## Type

One family, Mona Sans (GitHub, OFL), self-hosted as a variable font
(`assets/fonts/`, weight 200 to 900, width 75 to 125):

- 600 with tight tracking (-0.04 to -0.055em) for the name, titles and headings
- 300 for large readouts (0.7244, 20 x 84 = 1,680)
- 400 and 500 for text, 17px at 1.55

Its tabular figures carry a slashed zero that reads as a terminal, so tabular
numerals are switched off site-wide and the proportional ones are used
everywhere. System monospace appears once, for a literal `brew install`.

## Pages

| page | what it is |
|---|---|
| `/` | the name, the slide rule, seven projects, both papers, the school papers, the record, contact |
| `/work/<slug>/` | one page per project, each opening on the product running |
| `/research/` | both papers in full, with the explorable 84, and three school projects |
| `/plain/` | one printable file, no JavaScript |
| `/404.html` | the slide rule, parked off the scale |

Between pages, two ways by engine (`assets/js/vt.js` decides in the head):

- Chrome and other Chromium browsers but Arc run a cross-document view
  transition (vt.js opts in there only). The page being left fades out on top
  of the one arriving, which is already in place and brings its own content
  in as on a first load. The project title the visitor followed flies from
  where it was to where it goes: home to case page, case page back to its
  place on the home page, a "Next project" link to the next case title. Only
  that one title is named, on the way out and on the way in, and only while
  it is on screen (titles marked `data-vt="<slug>"`). A title that arrives
  this way skips its own rise (`html.vt-flown`).
- Safari has the same feature but blanks the window for several frames before
  it starts, so Safari and Firefox navigate plainly. With a mouse or trackpad
  a veil in the page's colour closes over the page under the bar first
  (`html.is-leaving`, 170ms) and then the page navigates, because WebKit
  stops drawing a page as soon as a navigation starts. The next page comes up
  under the closed veil (`html.is-arriving`), and the veil lifts as its
  entrance plays (`html.is-lifting`), started in a frame callback after the
  first frame: started earlier, WebKit dated the lift by an older frame and
  half of it was over before anything was painted. On touch screens the page
  is not veiled, so Safari's swipe-back preview, taken as the navigation
  starts, shows the page and not an empty one.
- Arc is Chromium, but it keeps neither page on screen between the two: for
  a few frames after every click its window shows a flat colour, so a view
  transition there starts with a blink and the old page reappearing. Arc
  takes Safari's way, with the veil over the bar too (`html.is-arc`), so the
  screen is already that flat colour when Arc empties it. vt.js knows Arc by
  its client hints on macOS and Windows, which name Chromium and no browser
  of its own, and, once a page has loaded, by the `--arc-palette-*`
  properties Arc sets on the root.

A link to a place on another page (the bar's Work, Record and Contact,
"All work", a paper on the research page) opens that page on the place, not
on its top with a glide down after it: vt.js moves the page there before its
first frame (in Chromium the frame waits up to 700ms for the place to be
parsed, `rel=expect`; under the veil it waits for DOMContentLoaded), and a
project title landed on or flown to is shown at once (`.is-now`) rather than
rising from under the place. Smooth scrolling (`html.is-smooth`) starts only
once the page has loaded, for same-page links. The bar takes its ground in
the same frame when a page opens scrolled (`html.is-snap`).

Every case page, and the research page, opens with a back button over the
title (`.back`). When the step before this one in history is the page it
points to, it goes back, to the same place on that page; otherwise (the
visitor landed here, or a contents link has added a step within the page)
it links to the project on the home page. The "All work" link at the foot
does the same.

Nothing should make the new page wait once its HTML has arrived, so the CSS
and JS ship fingerprinted and cached for a year (`tools/fingerprint.sh`), and
each page prefetches the other pages' stylesheets at idle.

Nor should the HTML itself keep a click waiting. The loops download over the
same connection as everything else, and a page queued behind a megabyte of
video waits whole seconds on a slow line. So, in Chromium, the pages a
visitor most likely opens next are fetched as the page opens (speculation
rules, `immediate`), not when the pointer reaches their links: every case
page from the home page, the next project from a case page. Any other page
is fetched once the pointer rests on a link to it (`eager`, 10ms). WebKit
is given no rules: where it took them, its arrivals dropped frames.

## Showing the products

| component | what it is |
|---|---|
| `.win` (+ `.is-dark`) | a browser window: a quiet bar with the address, the recording under it |
| `.stage` | the coloured surface a product stands on; `.stage-cap` is its caption |
| `.phone`, `.gl-phones` | phone screens on a stage |
| `.bezel` | a dark stage for a single screenshot |
| `.plate` | a neutral tile for a figure |

Every loop in `assets/video/` was recorded from the live product (vertexmma.com,
gluline.com, Clipwell's site, indelible's site, the Vertex Boxing report) or cut
from its own footage. indelible's sheets are pages it printed itself, from the
sample study folder in its repository (an invented learner) and a 2-day recheck. They are muted H.264 MP4s with a WebP poster from their first frame,
`preload="none"`, width and height always set. `site.js` starts loading a loop
a screen before it arrives, plays it only while it is on screen and gives it one round pause
control in its lower right corner; the videos inside a `[data-play-group]` (the
phones on one stage) share a single control. Under reduced motion every loop
stays on its poster.

Nothing redraws on every frame unless it is moving on screen: scroll-driven
figures listen only while they are within a screen of the viewport (`whileNear`
in `site.js`), an endless animation holds while its `[data-loop]` figure is off
screen, marks that move in turn share one frame loop, an index that follows a
loop (Alfa-Romeo's screens, the Vertex MMA bout) fills its item with one
browser animation per item rather than from script on every frame
(`RP.follow` and `RP.fill`), and nothing blurs what sits behind a playing loop.

## Figures

All figures are SVG strings built by `assets/js/figures.js` from
`assets/data/audit.json` (generated from the papers by `tools/build_data.py`)
and `assets/data/boxing.json` (copied from the Vertex Boxing report, section by
section). `tools/figures.mjs` writes each one into the HTML between
`<!--@name-->` markers, so a page is complete before any script runs; the
browser redraws only what is interactive. Run it after changing a renderer or
the data:

```bash
node tools/figures.mjs                 # every page
node tools/figures.mjs index.html      # one page
node tools/figures.mjs --check         # exit 1 if a page is stale
```

| figure | where | what it shows |
|---|---|---|
| the slide rule | home hero | the bar for k hypotheses is 20k; drag or use the arrow keys |
| the 84 | home, research | every hypothesis at its e-value on a log axis; switch prices and raise the bar |
| AUC gauge | home, Vertex MMA | 0.7244 on a scale from a coin flip to 1 |
| model against the line | home, Vertex MMA | the closing line wins all three scores; the winner is underlined |
| level bars | home, Vertex Boxing | closing-line value rises with the level of the fight |
| four windows | home, Vertex Boxing | e-values at the opening price against the bar |
| the book | home, Zacks | 4,369 stocks, 25 dots at the same scale, opened out into 25 equal positions |
| the floor | home, Vertex MMA, research | everything measured sits inside the detection floor |
| the Collatz path | research | the path of any start from 2 to 1,000 on a log scale |
| the school sparklines | home | the sausage's traced edge, the glass's discs, the path of 27 |
| the 48 hours | home, indelible | the same day's sheets are practice; the recheck two days later is the first score that counts |
| one topic, lesson to retired | indelible | the default intervals on a log scale of days; an example, labelled so; blue from the recheck on |
| question 4, working | indelible | a printed question takes an answer, and its check line runs backwards from it |

Two honesty rules the figures follow: a truncated axis says so in the figure,
and a schematic is labelled as a schematic.

## Motion

Exponential ease-outs (`cubic-bezier(0.16, 1, 0.3, 1)`), no bounce. Each stage
arrives whole, as one fade and rise; the rest of the motion measures something
or shows something measured:

| effect | why |
|---|---|
| the slide rule sets itself: the slide moves to 20, the cursor runs to 84 | it performs the page's one calculation |
| needles sweep to their values | the AUC and the four Boxing windows are read off like gauges |
| the thesis is struck through | Vertex Boxing's founding claim, refuted by its own data |
| the rejected ideas are struck through | Vertex MMA keeps its failures on record |
| the 84 drop onto the axis | a dot plot settling |
| the record's pen crosses the school years | a chart recorder; it never unwrites |
| indelible's sheets land in the day's order, then the 48 hours are drawn, then the recheck | the method's own sequence |
| a pen draws indelible's time axis and each stop lands as it is reached | a schedule being kept |
| the product loops play in view | the products, working |

Under `prefers-reduced-motion` every figure is drawn in its final state and the
loops stay still, and with JavaScript off everything is visible (a script in the
head adds the `js` class that motion depends on, and removes it again if the
scripts never run).

## Rules kept

- no em dashes in the copy
- no gradient text, no glass cards, no side stripes
- no marquees, loaders, colour scenes, giant background words or custom cursors
- no tiny uppercase labels as section grammar, no numbered sections
- body copy capped near 62 characters
