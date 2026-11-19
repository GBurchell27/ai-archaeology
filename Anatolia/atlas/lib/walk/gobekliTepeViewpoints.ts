/**
 * Where the 41 photographs that trained this site's splat were taken, thinned to 26 viewpoints.
 * Walk metres from the walker's start, after the splat alignment: camera positions, not finds and not map coordinates.
 * Written by scripts/splat/export_viewpoints.py. Do not edit by hand: run it again after a retrain or a new alignment.
 */

import type { PhotoViewpoint } from "./photoViewpoints";

export const GOBEKLI_TEPE_VIEWPOINTS: readonly PhotoViewpoint[] = [
  { positionM: [-0.38, 1.88, -0.05], lookAtM: [1.35, -3.05, -8.58] },
  { positionM: [8.34, 2.58, 0.18], lookAtM: [3.93, -3.86, -6.07] },
  { positionM: [13.38, 3.11, -2.41], lookAtM: [15.21, -1.25, -11.22] },
  { positionM: [13.65, 3.23, -2.26], lookAtM: [7.10, -1.76, -7.94] },
  { positionM: [21.47, 3.65, -7.75], lookAtM: [19.34, -3.50, -14.40] },
  { positionM: [23.40, 3.47, -8.53], lookAtM: [20.38, -1.78, -16.49] },
  { positionM: [24.75, 3.21, -10.10], lookAtM: [19.55, -3.35, -15.58] },
  { positionM: [26.49, 3.03, -13.47], lookAtM: [21.13, -2.56, -19.80] },
  { positionM: [16.50, 2.72, -26.88], lookAtM: [13.51, -2.83, -19.11] },
  { positionM: [18.60, 3.72, -30.47], lookAtM: [12.34, 0.67, -23.29] },
  { positionM: [18.70, 3.68, -30.51], lookAtM: [9.82, -0.87, -29.84] },
  { positionM: [10.58, 3.65, -36.04], lookAtM: [5.95, -2.36, -29.52] },
  { positionM: [4.82, 3.33, -35.29], lookAtM: [3.59, -4.01, -28.62] },
  { positionM: [2.45, 2.20, -34.30], lookAtM: [2.70, -4.96, -27.32] },
  { positionM: [0.69, 2.83, -35.25], lookAtM: [4.39, -2.85, -27.90] },
  { positionM: [-2.53, 2.59, -36.15], lookAtM: [-8.21, -2.85, -29.96] },
  { positionM: [-9.25, 1.48, -34.51], lookAtM: [-1.12, -1.69, -29.61] },
  { positionM: [-9.80, 0.84, -33.25], lookAtM: [-6.99, -5.05, -25.67] },
  { positionM: [-13.22, 0.54, -31.61], lookAtM: [-7.14, -5.89, -26.95] },
  { positionM: [-15.14, -0.27, -28.35], lookAtM: [-7.56, -6.77, -27.85] },
  { positionM: [-17.03, -0.59, -18.71], lookAtM: [-11.37, -3.71, -26.34] },
  { positionM: [-16.35, -0.52, -16.89], lookAtM: [-10.46, -6.77, -22.01] },
  { positionM: [-15.38, -0.26, -14.56], lookAtM: [-8.04, 0.68, -21.29] },
  { positionM: [-13.71, 0.03, -12.48], lookAtM: [-10.74, -2.80, -21.61] },
  { positionM: [-10.81, 0.80, -5.62], lookAtM: [-2.73, -3.00, -10.12] },
  { positionM: [-5.07, -1.57, -30.17], lookAtM: [4.15, -4.42, -27.56] },
];
