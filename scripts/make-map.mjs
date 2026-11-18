// @ts-check
/**
 * @module make-map
 * Makes the map's coastline (MAP-001, DEC-026). With `--download` it fetches Natural Earth's
 * `ne_110m_land.geojson` into data/ (the only network use, at development time). Without the flag
 * it reads that file and writes data/map-outline.svg: one `<path>` of all land rings on the pins'
 * 720 by 360 whole-world grid. `scripts/build.mjs` puts that path into the page; the page itself
 * loads nothing. It does not draw the map or place pins (`views/map.js` does).
 * Run it with `node scripts/make-map.mjs --download`, then `node scripts/make-map.mjs`.
 * Data: Natural Earth, public domain (https://www.naturalearthdata.com/about/terms-of-use/).
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** The one file the `--download` step fetches (DEC-026). */
const sourceUrl =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson";

/** Rings lying wholly south of this latitude are outside the map's view and left out. */
const southernLimit = -58;

/**
 * @typedef {number[]} Position `[longitude, latitude]`.
 * @typedef {Position[]} Ring
 * @typedef {object} Geometry
 * @property {string} type `Polygon` or `MultiPolygon`.
 * @property {unknown} coordinates
 * @typedef {object} LandCollection The parts of the GeoJSON file this script reads.
 * @property {{ geometry: Geometry }[]} features
 */

/**
 * @param {number} value
 * @returns {number} The value rounded to one decimal.
 */
function oneDecimal(value) {
  return Math.round(value * 10) / 10;
}

/**
 * Puts a place on the 720 by 360 whole-world grid the pins use.
 * @param {number} longitude Degrees east, -180 to 180.
 * @param {number} latitude Degrees north, -90 to 90.
 * @returns {{ x: number, y: number }} The grid point, to one decimal.
 */
export function project(longitude, latitude) {
  return { x: oneDecimal((longitude + 180) * 2), y: oneDecimal((90 - latitude) * 2) };
}

/**
 * @param {Geometry} geometry
 * @returns {Ring[]} Every ring (outer rings and holes) of a polygon or multipolygon.
 */
function ringsOf(geometry) {
  if (geometry.type === "Polygon") return /** @type {Ring[]} */ (geometry.coordinates);
  if (geometry.type === "MultiPolygon") {
    return /** @type {Ring[][]} */ (geometry.coordinates).flat();
  }
  return [];
}

/**
 * @param {Ring} ring
 * @returns {string} The ring as a closed subpath; a point equal to the one before it is dropped.
 *   GeoJSON repeats a ring's first point at its end, and the closing `Z` makes that point redundant.
 */
function subpathOf(ring) {
  const points = ring.slice(0, -1).map(([longitude, latitude]) => project(longitude, latitude));
  const kept = points.filter(
    (point, index) =>
      index === 0 || point.x !== points[index - 1].x || point.y !== points[index - 1].y,
  );
  return (
    kept.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join("") + "Z"
  );
}

/**
 * @param {LandCollection} land The parsed `ne_110m_land.geojson`.
 * @returns {string} The `d` of one path of all land rings that reach the map's view; empty if none.
 */
export function outlinePath(land) {
  return land.features
    .flatMap((feature) => ringsOf(feature.geometry))
    .filter((ring) => ring.some(([, latitude]) => latitude >= southernLimit))
    .map(subpathOf)
    .join("");
}

/**
 * @param {LandCollection} land
 * @returns {string} The text of data/map-outline.svg: one `<path>` and a line break.
 */
export function outlineSvg(land) {
  return `<path class="map-land" d="${outlinePath(land)}" />\n`;
}

/**
 * Runs the download or the generation for the repository when this file is started from the
 * command line.
 */
async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = path.join(root, "data", "ne_110m_land.geojson");
  if (process.argv.includes("--download")) {
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`Download of ${sourceUrl} failed: ${response.status}`);
    await writeFile(source, Buffer.from(await response.arrayBuffer()));
    return;
  }
  const land = JSON.parse(await readFile(source, "utf8"));
  await writeFile(path.join(root, "data", "map-outline.svg"), outlineSvg(land));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
