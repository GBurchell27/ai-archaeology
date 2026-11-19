/**
 * Where the 17 photographs that trained this site's splat were taken, thinned to 8 viewpoints.
 * Walk metres from the walker's start, after the splat alignment: camera positions, not finds and not map coordinates.
 * Written by scripts/splat/export_viewpoints.py. Do not edit by hand: run it again after a retrain or a new alignment.
 */

import type { PhotoViewpoint } from "./photoViewpoints";

export const KARAHAN_TEPE_VIEWPOINTS: readonly PhotoViewpoint[] = [
  { positionM: [0.00, 1.65, 0.00], lookAtM: [0.00, 1.24, -9.99] },
  { positionM: [1.63, 1.67, 1.69], lookAtM: [-0.02, 1.04, -8.16] },
  { positionM: [-1.41, 1.98, -3.54], lookAtM: [0.26, 1.18, -13.37] },
  { positionM: [-1.48, 1.78, -5.22], lookAtM: [4.09, -1.98, -12.62] },
  { positionM: [-0.59, 1.63, -6.93], lookAtM: [3.52, -4.87, -13.32] },
  { positionM: [-3.86, 0.53, -12.77], lookAtM: [5.66, -2.54, -12.76] },
  { positionM: [-7.78, 8.56, 7.34], lookAtM: [-3.42, 4.33, -0.61] },
  { positionM: [10.19, 1.76, 6.04], lookAtM: [5.03, 1.11, -2.49] },
];
