#!/bin/sh
# Point the product loops at media.prigodskii.dev in a copy of the site, and
# open that connection early: each page with loops gets a preconnect next to
# its font preload.
#
# The loops are megabytes of video. On the pages' own HTTP/2 connection a
# page asked for while one was downloading waited behind it, whole seconds on
# a slow line; from their own host they hold nothing up (server/nginx,
# server/docker-compose.yml). The repo keeps relative paths, so the GitHub
# Pages mirror and a local server play the loops from wherever the page is.
#
#   tools/media.sh <dir>    (deploy.sh runs it on the copy it ships, once
#                            media.prigodskii.dev answers)
set -eu

MEDIA=https://media.prigodskii.dev
cd "$1"
grep -rlE 'src="(\.\./)*assets/video/' --include='*.html' . | while read -r f; do
  MEDIA=$MEDIA perl -0pi -e '
    s#src="(?:\.\./)*assets/video/#src="$ENV{MEDIA}/assets/video/#g;
    s#(<link rel="preload" href="[^"]*mona-sans-200-900-normal-latin\.woff2"[^>]*>)#<link rel="preconnect" href="$ENV{MEDIA}">\n$1#;
  ' "$f"
done
