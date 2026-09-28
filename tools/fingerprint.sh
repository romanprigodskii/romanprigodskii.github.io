#!/bin/sh
# Fingerprint the CSS and JS in a copy of the site: each page's reference to
# assets/css/site.css becomes assets/css/site.css?v=<first ten hex digits of
# the file's SHA-256>, and so on for every stylesheet and script.
#
# nginx lets a browser keep a ?v= URL for a year (server/nginx/default.conf),
# so a click from one page to the next waits for nothing but the new page's
# HTML. Unversioned, the stylesheets were revalidated on every click, and the
# new page could not be drawn until the server had answered: Safari showed a
# blank white frame for that long, in the middle of the page transition.
#
#   tools/fingerprint.sh <dir>    (deploy.sh runs it on the copy it ships)
set -eu

cd "$1"
for f in assets/css/*.css assets/js/*.js; do
  v=$(shasum -a 256 "$f" | cut -c1-10)
  n=$(basename "$f" | sed 's/\./\\./g')
  find . -name '*.html' -exec sed -i.fp "s#\(assets/[a-z]*/\)$n\"#\1$n?v=$v\"#g" {} +
done
find . -name '*.html.fp' -delete
