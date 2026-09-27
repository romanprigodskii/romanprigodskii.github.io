#!/usr/bin/env node
/* Pre-renders the site's figures into its HTML.

   Every page carries its figures as inline SVG between markers,
     <!--@name-->  ...  <!--/@name-->
   and this script replaces what sits between each pair with a fresh render
   from assets/js/figures.js and the data files. It is idempotent: run it
   whenever figures.js, audit.json or boxing.json change, and commit the
   result. Nothing on the live site depends on it running.

     node tools/figures.mjs                     # all pages
     node tools/figures.mjs research/index.html # one page
     node tools/figures.mjs --check             # exit 1 if any page is stale */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const F = require(path.join(root, "assets/js/figures.js"));
const audit = JSON.parse(fs.readFileSync(path.join(root, "assets/data/audit.json"), "utf8"));
const boxing = JSON.parse(fs.readFileSync(path.join(root, "assets/data/boxing.json"), "utf8"));
const rows = audit.segments.rows;

/* extra renderers a page may register: assets/js/figures-<page>.js exporting { markers(F, data) } */
const extra = {};
for (const f of fs.readdirSync(path.join(root, "assets/js"))) {
  const m = f.match(/^figures-([\w-]+)\.js$/);
  if (!m) continue;
  const mod = require(path.join(root, "assets/js", f));
  if (mod && typeof mod.markers === "function") Object.assign(extra, mod.markers(F, { audit, boxing }));
}

const book = Array.from({ length: 25 }, (_, i) => `<i style="--i:${i}"></i>`).join("");
const T = {
  grid: () => F.grid(),
  edge: () => F.edge(),
  ruleD: () => F.ruleD(),
  ruleC: () => F.ruleC(),
  aucScale: () => F.aucScale(),
  verdictWide: () => F.verdict(rows, 1300, "ef", { bar: 20, sfx: "-w" }),
  verdictNarrow: () => F.verdict(rows, 358, "ef", { bar: 20, sfx: "-n" }),
  floorWide: () => F.floor(audit.floor, 1100, "-w"),
  floorNarrow: () => F.floor(audit.floor, 358, "-n"),
  levelWide: () => F.levelBars(boxing.level, 1000),
  levelNarrow: () => F.levelBars(boxing.level, 358),
  windowsWide: () => F.windowsGauge(boxing.windows, 1000),
  windowsNarrow: () => F.windowsGauge(boxing.windows, 358),
  zkWide: () => F.zacksField(257, 17),
  zkNarrow: () => F.zacksField(91, 48, 1),
  fanWide: () => F.zacksFan(257),
  fanNarrow: () => F.zacksFan(91),
  book: () => book,
  ...extra,
};

const pages = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name.startsWith(".") || ["node_modules", "tools", "server", "papers", "assets"].includes(f.name)) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (f.name.endsWith(".html")) pages.push(p);
  }
})(root);

const check = process.argv.includes("--check");
const only = process.argv.slice(2).filter((a) => !a.startsWith("--")).map((a) => path.resolve(root, a));
if (only.length) pages.splice(0, pages.length, ...only);
let stale = 0, total = 0;
for (const file of pages) {
  const html = fs.readFileSync(file, "utf8");
  const out = html.replace(/<!--@([\w-]+)-->[\s\S]*?<!--\/@\1-->/g, (all, name) => {
    const fn = T[name];
    if (!fn) { console.warn(`${path.relative(root, file)}: no renderer for @${name}`); return all; }
    total++;
    return `<!--@${name}-->${fn()}<!--/@${name}-->`;
  });
  if (out !== html) {
    stale++;
    if (!check) fs.writeFileSync(file, out);
    console.log((check ? "stale: " : "wrote: ") + path.relative(root, file));
  }
}
console.log(`${total} figures across ${pages.length} pages`);
if (check && stale) process.exit(1);
