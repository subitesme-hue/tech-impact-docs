// Precompute the dotted world map (land dots + country name) once, so render workers don't.
import fs from 'node:fs';
import {geoEquirectangular, geoContains} from 'd3-geo';
import {feature} from 'topojson-client';
const world = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-110m.json', 'utf8'));
const countries = feature(world, world.objects.countries).features;
const proj = geoEquirectangular().scale(1920 / (2 * Math.PI)).translate([960, 600]);
const out = [];
for (let y = 60; y < 1040; y += 12) for (let x = 6; x < 1920; x += 12) {
  const ll = proj.invert([x, y]);
  if (!ll || ll[1] < -58) continue;
  const hit = countries.find((c) => geoContains(c, ll));
  if (hit) out.push([x, y, hit.properties.name]);
}
fs.writeFileSync('src/components/dots.json', JSON.stringify(out));
console.log(out.length, 'dots');
