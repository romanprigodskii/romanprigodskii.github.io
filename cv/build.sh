#!/bin/sh
# Print the CV (two pages) and the résumé (one page) from cv.html.
#
# Chrome prints the page as it would to paper; pypdf then sets the
# document's title and author, and the build fails if either file has
# grown past its page count.
#
#   cv/build.sh
set -eu
cd "$(dirname "$0")"

CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
trap 'rm -rf .fonts' EXIT

# Chrome embeds a variable font as Type 3 glyphs, which some readers draw
# soft and some parsers cannot read. Static instances of the weights the page
# uses go in as TrueType instead. They exist only for the build: Mona Sans
# reserves its name, so a changed copy of it is never kept or shipped.
python3 - <<'EOF' || echo "note: no static instances (needs fontTools and brotli); printing with the variable font" >&2
import os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

os.makedirs(".fonts", exist_ok=True)
for style, weights in (("normal", (400, 500, 600)), ("italic", (400,))):
    for weight in weights:
        font = TTFont(f"../assets/fonts/mona-sans-200-900-{style}-latin.woff2")
        static = instantiateVariableFont(font, {"wght": weight, "wdth": 100})
        static.flavor = None
        # named as Mona Sans's own static fonts are, so the PDF lists the
        # weight it uses rather than the variable font's ExtraLight default
        sub = "Italic" if style == "italic" else {400: "Regular", 500: "Medium", 600: "SemiBold"}[weight]
        names = static["name"]
        for rec in list(names.names):
            if rec.nameID in (16, 17, 21, 22, 25):
                names.removeNames(nameID=rec.nameID)
        for nid, text in ((1, "Mona Sans"), (2, sub), (4, f"Mona Sans {sub}"), (6, f"MonaSans-{sub}")):
            for rec in names.names:
                if rec.nameID == nid:
                    rec.string = text
        static.save(f".fonts/{style}-latin-{weight}.ttf")
EOF

# Headless Chrome writes the PDF in a second or two and then often never
# quits, so it is stopped as soon as the file ends with its %%EOF.
print() { # print <query> <file>
  profile=$(mktemp -d)
  rm -f "$2"
  "$CHROME" --headless --user-data-dir="$profile" --no-first-run \
    --no-default-browser-check --disable-background-networking \
    --disable-component-update --disable-sync --disable-extensions \
    --allow-file-access-from-files --virtual-time-budget=10000 \
    --no-pdf-header-footer --generate-pdf-document-outline \
    --print-to-pdf="$PWD/$2" "file://$PWD/cv.html$1" >/dev/null 2>&1 &
  pid=$!
  tries=0
  until tail -c 8 "$2" 2>/dev/null | grep -q '%%EOF'; do
    tries=$((tries + 1))
    if [ "$tries" -gt 600 ]; then
      pkill -f "user-data-dir=$profile" || true
      echo "Chrome did not print $2 within a minute" >&2
      exit 1
    fi
    sleep 0.1
  done
  pkill -f "user-data-dir=$profile" || true
  wait "$pid" 2>/dev/null || true
  rm -rf "$profile"
}

print "" Roman_Prigodskii_CV.pdf
print "?resume" Roman_Prigodskii_Resume.pdf

python3 - <<'EOF'
from pypdf import PdfReader, PdfWriter

about = "Letovo School, Moscow. Economics olympiads, e-values, forecasts graded against market prices."
for name, title, pages in [
    ("Roman_Prigodskii_CV.pdf", "Roman Prigodskii, CV", 2),
    ("Roman_Prigodskii_Resume.pdf", "Roman Prigodskii, résumé", 1),
]:
    reader = PdfReader(name)
    if len(reader.pages) != pages:
        raise SystemExit(f"{name}: {len(reader.pages)} pages, it should be {pages}")
    writer = PdfWriter(clone_from=reader)
    writer.add_metadata({"/Title": title, "/Author": "Roman Prigodskii", "/Subject": about,
                         "/Creator": "prigodskii.dev, cv/build.sh"})
    with open(name, "wb") as f:
        writer.write(f)
    print(f"{name}: {pages} page{'s' if pages > 1 else ''}")
EOF
