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

The stages (`.stage.is-dark`, `.is-mist`, `.is-red`, `.is-sage`) take their
colour from the product on them: Vertex's dark web app, Gluline's mist, the
bank's red, Clipwell's desktop. They are the only coloured surfaces on the site.

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
| `/` | the name, the slide rule, six projects, both papers, the school papers, the record, contact |
| `/work/<slug>/` | one page per project, each opening on the product running |
| `/research/` | both papers in full, with the explorable 84, and three school projects |
| `/plain/` | one printable file, no JavaScript |
| `/404.html` | the slide rule, parked off the scale |

Moving from a project on the home page to its page, the title travels into
place (a cross-document view transition, `view-transition-name: t-<slug>`); the
rest of the page fades. Browsers without it simply navigate.

## Showing the products

| component | what it is |
|---|---|
| `.win` (+ `.is-dark`) | a browser window: a quiet bar with the address, the recording under it |
| `.stage` | the coloured surface a product stands on; `.stage-cap` is its caption |
| `.phone`, `.gl-phones` | phone screens on a stage |
| `.bezel` | a dark stage for a single screenshot |
| `.plate` | a neutral tile for a figure |

Every loop in `assets/video/` was recorded from the live product (vertexmma.com,
gluline.com, Clipwell's site, the Vertex Boxing report) or cut from its own
footage. They are muted H.264 MP4s with a WebP poster from their first frame,
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
