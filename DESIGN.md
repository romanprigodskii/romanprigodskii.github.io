# Design notes

## The idea

Every page is drawn on semi-log paper, and the paper is data. Each vertical line
behind a page sits at m x 10^k on an e-value axis that runs from 0.01 at the
frame's left edge to 1,680 at its right edge:

| line | what it is |
|---|---|
| 0.01 | the frame's left edge |
| 1 | a bet that broke even; the main content edge (`--x1`) |
| 20 | the bar for one pre-registered hypothesis |
| 1,680 | the bar for all 84 hypotheses at once (20 x 84); the frame's right edge |

The five decades are the layout's columns (`.cols`: four columns of 19.14% and
the last decade, 100 to 1,680, as 1fr). Every e-value figure on the site is
drawn on the same axis, so its ticks land on the page's own lines, and the
slide rule in the hero computes the right-hand edge: 20 x 84 = 1,680.

Reference: Braun instruments (white enamel, brushed aluminium, black
graduations, one signal colour) laid on Muller-Brockmann grid paper. The scene
it was designed for: an admissions reader or a workshop statistician, on a
laptop in a daylit office, with twenty files queued.

## Colour

| token | value | use |
|---|---|---|
| `--paper` | #F3F2EE | the ground |
| `--enamel` | #FBFAF7 | instrument plates |
| `--ink` | #151412 | type, graduations, bars |
| `--ink-2` | #4B4944 | secondary text (8:1 on paper) |
| `--ink-3` | #6B6861 | tertiary text (5:1) |
| `--g-*` | #E7E5DF to #ABA89F | the grid, lightest to darkest |
| `--signal` | #E0401C | a measurement that clears its bar, and nothing else |
| `--signal-t` | #C4351A | the same, as text (4.8:1) |

Vermilion never decorates. If a mark is red, it cleared 20 (or whatever bar
the figure states). The model beating nobody is drawn in ink.

## Type

One family, Barlow, in two widths, self-hosted (OFL, `assets/fonts/`):

- **Barlow Condensed** for the name, titles, figure labels, scales and every
  numeral in a figure: 800 for the name and project titles, 600 to 700 for
  headings, 200 to 300 for large readouts (0.7244, 20 x 84 = 1,680).
- **Barlow** for prose, 17px at 1.55.
- System monospace appears once, for a literal `brew install` command.

Its condensed heavy weights come from the same signage lineage as DIN, which is
the lettering of engineering drawings. Sofia Sans was tried first and rejected:
its "g" carries a flag that reads as a diacritic at the size of the name.

## Pages

| page | what it is |
|---|---|
| `/` | the name, the slide rule, six projects, both papers, the record, contact |
| `/work/<slug>/` | one page per project, each opening on its own instrument |
| `/research/` | both papers in full, with the explorable 84, and two school projects |
| `/plain/` | one printable file, no JavaScript |
| `/404.html` | the slide rule, parked off the scale |

Moving from a project on the home page to its page, the title travels into
place (a cross-document view transition, `view-transition-name: t-<slug>`); the
rest of the page fades. Browsers without it simply navigate.

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
| the 84 | home, research | every hypothesis at its e-value on the page's axis; switch prices and raise the bar |
| AUC gauge | home, Vertex MMA | 0.7244 on a scale from a coin flip to 1 |
| model against the line | home, Vertex MMA | the closing line wins all three scores; the winner is underlined |
| level bars | home, Vertex Boxing | closing-line value rises with the level of the fight |
| four windows | home, Vertex Boxing | e-values at the opening price; the needle's head says how the test was fixed |
| the book | home, Zacks | 4,369 stocks, 25 dots at the same scale, opened out into 25 equal positions |
| the floor | home, Vertex MMA, research | everything measured sits inside the detection floor |

Two honesty rules the figures follow: a truncated axis says so in the figure,
and a schematic is labelled as a schematic.

## Motion

Exponential ease-outs (`cubic-bezier(0.16, 1, 0.3, 1)`), no bounce. Every
movement measures something or shows something measured:

| effect | why |
|---|---|
| the grid draws down, the name is engraved left to right | the paper is laid, then the plate is cut |
| the slide rule sets itself: the slide moves to 20, the cursor runs to 84 | it performs the page's one calculation |
| ruler edges tick in along each section | each section starts on the scale |
| needles sweep to their values | the AUC and the four Boxing windows are read off like gauges; a needle turns red as it crosses 20 |
| the thesis is struck through | Vertex Boxing's founding claim, refuted by its own data |
| the rejected ideas are struck through | Vertex MMA keeps its failures on record |
| the 84 drop onto the axis | a dot plot settling |
| the record's pen crosses the school years | a chart recorder; it ratchets and never unwrites |

Under `prefers-reduced-motion` every figure is drawn in its final state, and
with JavaScript off everything is visible (a script in the head adds the `js`
class that motion depends on, and removes it again if the scripts never run).

## Rules kept

- no em dashes in the copy
- no gradients except the slide rule's aluminium; no glass, no side stripes
- no marquees, loaders, colour scenes, giant background words or custom cursors
- no tiny uppercase labels as section grammar, no numbered sections
- body copy capped near 62 characters
