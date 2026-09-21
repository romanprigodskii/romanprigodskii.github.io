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

## Shape

The front page is one scroll with five gears: a hero that is mostly the name, a
ticker, a statement that lights word by word as it passes, the work as a pinned
horizontal filmstrip, and a research teaser that hands off to its own page. The
papers used to sit in the middle of the front page, which made a visitor read a
statistics abstract before they knew who they were reading. They now live at
`/research/`, where there is room for them.

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

1. **Hero field** (canvas): the 84 audit hypotheses as chalk marks, plus the two
   rejection thresholds.
2. **Model against the closing line** (HTML bars): the comparison on every
   basis, including where the baseline wins.
3. **The ladder** (SVG): one post-hoc rule charged three ways.
4. **The detection floor** (HTML, measured band): fifteen candidate levers
   against the noise floor. Built in HTML rather than SVG so that fifteen long
   labels stay readable on a phone.
5. **The full scatter** (SVG): all 84 hypotheses, log-log, mark size by sample size.

Colour in the charts always encodes something: vermilion means "clears the
threshold" or "shipped", never "decorative".

Two honesty rules the charts follow, because the whole page is an argument about
measurement:

- **Every truncated axis says so, in the chart.** The model-against-the-line
  differences are far smaller than a 0-to-1 axis would show, so each row gets its
  own truncated range, printed underneath it.
- **Bar length always means better.** Log-loss and Brier are lower-is-better, so
  those rows run right to left. Without that, the longer bar would have read as
  the winner while being the loser.

## Motion

Effects, and what each is for:

| effect | why it is there |
|---|---|
| intro counter | counts to 84, the number of hypotheses the page is about. Once per session, skippable, gone under reduced motion |
| word masking | headings and ledes rise word by word. Split at text-node level, so nested links survive |
| ticker | the credentials, moving, so the fold is not the only place they appear |
| scroll-lit statement | words go from muted to full as the paragraph passes the middle of the screen |
| pinned filmstrip | vertical scroll drives horizontal travel through five project panels; below 900px it is a plain vertical list |
| stacking method cards | the five rules stack on each other, so the section is read as one idea |
| reticle cursor | a crosshair instead of an arrow, and over the hero field it reads out the two e-values under the point it is standing on. That is the only cursor gimmick on the page and it is a measuring instrument |
| page wipe | between the three pages. The keyframes are `both`, so the page opens even if the script never runs again |



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
