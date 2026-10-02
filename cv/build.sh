#!/bin/sh
# Typeset the CV (cv.tex, two pages at most) and the one-page resume
# (resume.tex: cv.tex with \resumeonly defined) with Tectonic, and fail if
# either has outgrown its pages.
#
#   cv/build.sh
set -eu
cd "$(dirname "$0")"
out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT

for tex in cv resume; do
  tectonic -X compile --outdir "$out" "$tex.tex" 2>&1 | grep -v '^note:' || true
done
mv "$out/cv.pdf" Roman_Prigodskii_CV.pdf
mv "$out/resume.pdf" Roman_Prigodskii_Resume.pdf

python3 - <<'PY'
from pypdf import PdfReader
for name, most in (("Roman_Prigodskii_CV.pdf", 2), ("Roman_Prigodskii_Resume.pdf", 1)):
    pages = len(PdfReader(name).pages)
    if pages > most:
        raise SystemExit(f"{name}: {pages} pages, it should be at most {most}")
    print(f"{name}: {pages} page{'s' if pages > 1 else ''}")
PY
