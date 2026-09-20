# Design notes

## The idea

The work on this site is about measurement: what a number is worth once you
price in everything that could have produced it by accident. So the site is
built like a school chalkboard, which is where that kind of argument is
usually first made.

- **Ground**: deep pine, the colour of a Russian school board. Not black. Near
  black is the default for every developer portfolio and it says nothing.
- **Ink**: chalk bone, warm, never pure white.
- **Signal**: a red-pen vermilion, used for the thing being marked. It carries
  thresholds, the one segment that survives, the shipped lever, and the whole
  contact section.
- **Chart secondaries**: chalk blue, used only where a second series needs
  telling apart from the first.

## Surfaces, not pages

Three palettes live in the same document and swap by `data-surface`:

| surface | where | why |
|---|---|---|
| `slate` | default | the board |
| `paper` | the research section | papers are printed on paper |
| `signal` | contact | the loudest thing on the page is the way to reach me |

The header reads the section under it on scroll and adopts that palette, so it
never sits as a foreign dark bar over a light section. A full light theme
inverts the whole document and flips the research section dark, keeping the
inversion meaningful rather than decorative.

## Type

One family: **Archivo**, variable, with both the weight and the **width** axis
in use. The width axis does the work a second typeface usually does:

- display and section heads at `font-stretch: 108-116%`, weight 700-780, tight
  tracking
- small labels at `font-stretch: 66-70%`, uppercase, weight 650, tracked out:
  a scoreboard voice, not a magazine kicker
- body at 100% width, weight 400-420
- tabular lining numerals everywhere, because most of this page is numbers

No monospace. Monospace on a quantitative portfolio is a costume; tabular
figures in the text face are the honest version.

## Imagery

Four charts, all drawn from the papers' own artifacts:

1. **Hero field** (canvas): the 86 audit segments as chalk marks, plus the two
   rejection thresholds.
2. **Model against the closing line** (HTML bars): the comparison on every
   basis, including where the baseline wins.
3. **The ladder** (SVG): one post-hoc rule charged three ways.
4. **The detection floor** (HTML, measured band): fifteen candidate levers
   against the noise floor. Built in HTML rather than SVG so that fifteen long
   labels stay readable on a phone.
5. **The full scatter** (SVG): all 86 segments, log-log, area by sample size.

Colour in the charts always encodes something: vermilion means "clears the
threshold" or "shipped", never "decorative".

## Motion

`cubic-bezier(0.16, 1, 0.3, 1)` throughout, no bounce. One staggered entrance,
then scroll reveals and chart draw-ins. Collapsible sections animate
`grid-template-rows`, never `height`. Everything collapses to nothing under
`prefers-reduced-motion`, and the whole page works with JavaScript off: the
accordions open, the reveals are visible, the header is static.

## Rules kept

- no gradient text, no glassmorphism as decoration, no coloured side stripes
- no em dashes anywhere in the copy
- no icon-above-heading card grids
- body copy capped at 42-68 characters
