#!/bin/sh
# Publish the site to prigodskii.dev.
#
# Ships HEAD, not the working tree, so what is live is always a commit you can
# point at. Only the pages and what they load go up (tools/, DESIGN.md and the
# rest stay here), plus server/, which becomes /opt/prigodskii-site on the box.
# Everything else in that directory is deleted on each run.
#
#   tools/deploy.sh
set -eu

HOST=root@185.79.139.204
KEY="$HOME/.ssh/vertexmma_vps_ed25519"
DEST=/opt/prigodskii-site
SITE="index.html 404.html robots.txt sitemap.xml assets papers plain research"

cd "$(dirname "$0")/.."
rev=$(git rev-parse --short HEAD)
if [ -n "$(git status --porcelain)" ]; then
  echo "note: uncommitted changes stay here, deploying $rev" >&2
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir "$tmp/html"
git archive HEAD $SITE | tar -x -C "$tmp/html"
git archive HEAD:server | tar -x -C "$tmp"
chmod -R u=rwX,go=rX "$tmp"

ssh="ssh -i $KEY -o IdentitiesOnly=yes"
rsync -rlpt --delete -e "$ssh" "$tmp/" "$HOST:$DEST/"
# up -d is a no-op unless the compose file changed. The reload picks up
# nginx/ changes; it waits for the pid file because a container that up -d
# just recreated may not have started nginx yet.
$ssh "$HOST" "cd $DEST && docker compose up -d --quiet-pull &&
  docker compose exec -T site sh -c 'until [ -s /var/run/nginx.pid ]; do sleep 0.2; done; nginx -s reload'"

echo "live: https://prigodskii.dev/ ($rev)"
