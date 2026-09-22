# Design notes

## The idea

The work on this site is about measurement: what a number is worth once you
price in everything that could have produced it by accident. Every effect on
the page is either measuring something or showing something that was measured.

## Palette

Three palettes share one set of slots (`tools/palettes.py`), and the default,
chosen by Roman, is **moss**: a deep moss ground, a linen ink, and one luminous
green for whatever is being marked. The green carries the thresholds, the
hypotheses that clear them, the shipped lever, the drenched contact section and
the page wipe. Graphite (grey, black and a signal yellow) and cobalt (midnight
blue, red and gold) remain available through `?palette=`. Every text and ground pair on every surface of every palette is
contrast-checked by the script before it ships.

## Shape

The front page is one scroll with four gears: a hero that is mostly the name, a
statement that lights word by word as it passes, the work as a pinned horizontal
filmstrip, and a research teaser that hands off to its own page. The
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

The hero is WebGL (`field3d.js`, raw, no library): the 84 hypotheses in three
dimensions, x the e-value at fair odds, y the same bet after the book's margin, z
the nine hypothesis families, with the two e = 20 thresholds as translucent
planes. While the hero is pinned, scrolling swings the camera round, collapses the
families onto one plane, and the two planes become the two dashed rules of the
ordinary scatter chart: the 3D picture folds into the figure from the paper. The
reticle reads out the hypothesis under it. Where WebGL is missing, a 2D canvas
field draws the same rows.

The filmstrip uses the real products. Clipwell is a five-second loop of its bar
coming up over this site, and Gluline is three phones from the build sent to App
Store review, the middle one a loop of the assistant being asked about a chat.
Vertex MMA and Alfa-Romeo are screenshots; Vertex Boxing is a drawing of the leak
it caught, and the client pipeline is a drawing of a rebalance, since it is
private. The loops are muted H.264 under a megabyte, play only while on screen,
and under reduced motion stay on their poster frame, which is their first frame.

The charts, all drawn from the papers' own artifacts:

1. **Hero field**: as above.
2. **Model against the closing line** (HTML bars): the comparison on every
   basis, including where the baseline wins.
3. **The ladder** (SVG): one post-hoc rule charged three ways.
4. **The detection floor** (HTML, measured band): fifteen candidate levers
   against the noise floor. Built in HTML rather than SVG so that fifteen long
   labels stay readable on a phone.
5. **The 84, explorable** (SVG, inside paper one): all 84 hypotheses, log-log,
   mark size by sample size. The nearest mark follows the pointer (or a tap, or
   the arrow keys, in order of wealth) and a panel beside it reads out its name
   from the registry, its family, both e-values and its rank; a family chip
   dims the other eight.
6. **The verdict** (HTML): paper one's whole result on one log scale from 1 to
   1,680, with 20, the bar for one hypothesis, and 151, the best of the 84.
7. **The echo** (HTML): paper two's shipped improvement against the largest
   effect a re-seeded refit produced, 80% of it.

The two papers share a header and nothing else. Each opens on the number it is
about, drawn as a measurement, and lays out its findings the way its argument
runs: paper one as figure-led rows, paper two as the four steps of a protocol.

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
| scroll-lit statement | words go from muted to full as the paragraph passes the middle of the screen |
| pinned filmstrip | vertical scroll drives horizontal travel through five project panels; below 900px it is a plain vertical list |
| the record, row by row | each olympiad row reads in as it rises past the bottom of the screen and out again under the header. It is tied to the scroll position, not fired once, so scrolling back undoes it like the sheets and the filmstrip |
| the newspaper wave | on /research/, the school project's cut edge, traced from the scan at its true proportions, draws in from the left as it rises into view and back out on the way down. The sine can be swapped for a triangle wave, which bends into it point by point, so the visitor sees why the claim is "a sine" and not just "a wave". Regenerated by `tools/sausage_wave.py --write` |
| the tea glass | beside it, the glass from the second school project fills with discs as it rises into view, from 2 to 128 and back on the way out, and a dot on the beaker's scale walks into the 200 to 225 ml window the water test left. Once the visitor takes the slider, the scroll lets go of it |
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
