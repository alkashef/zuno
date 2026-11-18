// @ts-check
/** @module make-map.test Unit tests for scripts/make-map.mjs (MAP-001, DEC-026). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { outlinePath, outlineSvg, project } from "../../scripts/make-map.mjs";

/** @param {number[][][][]} polygons Polygons, each a list of rings of [longitude, latitude]. */
function landOf(polygons) {
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry: { type: "MultiPolygon", coordinates: polygons } }],
  };
}

test("test_map_001_projection_puts_longitude_and_latitude_on_the_grid", () => {
  assert.deepEqual(project(-180, 90), { x: 0, y: 0 });
  assert.deepEqual(project(0, 0), { x: 360, y: 180 });
  assert.deepEqual(project(180, -90), { x: 720, y: 360 });
  assert.deepEqual(project(46.7, 24.7), { x: 453.4, y: 130.6 });
  assert.deepEqual(project(-0.1278, 51.5074), { x: 359.7, y: 77 });
});

test("test_map_001_outline_has_one_closed_subpath_per_ring_with_holes_and_islands", () => {
  const square = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ];
  const hole = [
    [2, 2],
    [2, 4],
    [4, 4],
    [2, 2],
  ];
  const island = [
    [20, 20],
    [30, 20],
    [30, 30],
    [20, 20],
  ];
  const path = outlinePath(landOf([[square, hole], [island]]));
  assert.equal(
    path,
    "M360 180L380 180L380 160L360 160Z" + "M364 176L364 172L368 172Z" + "M400 140L420 140L420 120Z",
  );
});

test("test_map_001_outline_leaves_out_rings_wholly_south_of_latitude_minus_58", () => {
  const southern = [
    [0, -70],
    [10, -70],
    [10, -80],
    [0, -70],
  ];
  const reaching = [
    [0, -70],
    [10, -57],
    [10, -80],
    [0, -70],
  ];
  assert.equal(outlinePath(landOf([[southern]])), "");
  assert.match(outlinePath(landOf([[reaching]])), /^M360 320L380 294/);
});

test("test_map_001_outline_reads_single_polygons_and_drops_repeated_points", () => {
  const ring = [
    [0, 0],
    [0.1, 0.1],
    [0.1, 0.1],
    [10, 0],
    [0, 0],
  ];
  const land = {
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [ring] } }],
  };
  assert.equal(outlinePath(land), "M360 180L360.2 179.8L380 180Z");
});

test("test_map_001_outline_svg_is_one_land_path_for_the_build", () => {
  const triangle = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 0],
  ];
  assert.equal(
    outlineSvg(landOf([[triangle]])),
    '<path class="map-land" d="M360 180L380 180L380 160Z" />\n',
  );
});
