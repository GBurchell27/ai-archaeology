/**
 * Pure geometry for a block whose twelve edges are worn instead of razor sharp. It is a unit box with three vertices
 * at every corner, one for each face that meets there, each carrying its own face's normal. Six faces, twelve edge
 * strips and eight corner triangles join those vertices, so a strip is shaded from one face's normal to the next and
 * reads as a rounded edge. All vertices of a corner start at the same place: whoever draws the block pulls each one
 * in across its own face (`bevelInset`), by a width in metres, so a block of any size gets the same worn edge.
 */

type Triple = readonly [number, number, number];

export type BevelledBlock = {
  /** Three numbers a vertex: the corners of a unit box centred on the origin. */
  positions: number[];
  /** Three numbers a vertex: the outward normal of the face the vertex belongs to. */
  normals: number[];
  /** Three vertex numbers a triangle, wound anticlockwise seen from outside. */
  triangles: number[];
};

const AXES = [0, 1, 2] as const;
const SIGNS = [-1, 1] as const;
const CORNERS: readonly Triple[] = SIGNS.flatMap((x) => SIGNS.flatMap((y) => SIGNS.map((z): Triple => [x, y, z])));

/** The vertex at this corner that belongs to the face across this axis. */
const vertexAt = (corner: Triple, axis: number) => 3 * CORNERS.findIndex((other) => other.every((sign, index) => sign === corner[index])) + axis;

function cornerWith(signs: Readonly<Record<number, number>>): Triple {
  return [signs[0], signs[1], signs[2]];
}

/** How far a vertex moves, in bevel widths: inwards along the two axes that lie in its face. */
export function bevelInset(corner: Triple, faceAxis: number): Triple {
  return cornerWith(Object.fromEntries(AXES.map((axis) => [axis, axis === faceAxis ? 0 : -corner[axis]])));
}

/** The four vertices of each face, in order round it. */
function faceQuads(): number[][] {
  return AXES.flatMap((axis) => {
    const [first, second] = AXES.filter((other) => other !== axis);
    const round: ReadonlyArray<readonly [number, number]> = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    return SIGNS.map((sign) => round.map(([a, b]) => vertexAt(cornerWith({ [axis]: sign, [first]: a, [second]: b }), axis)));
  });
}

/** The strip along each edge: two vertices from one of the faces that meet there, two from the other. */
function edgeQuads(): number[][] {
  return AXES.flatMap((along) => {
    const [first, second] = AXES.filter((other) => other !== along);
    return SIGNS.flatMap((a) =>
      SIGNS.map((b) => {
        const [near, far] = SIGNS.map((end) => cornerWith({ [along]: end, [first]: a, [second]: b }));
        return [vertexAt(near, first), vertexAt(far, first), vertexAt(far, second), vertexAt(near, second)];
      }),
    );
  });
}

/** Any bevel narrower than half the box gives the same windings. */
const WINDING_TEST_BEVEL = 0.1;

function placeForWinding(vertex: number): Triple {
  const corner = CORNERS[Math.floor(vertex / 3)];
  const inset = bevelInset(corner, vertex % 3);
  return cornerWith(Object.fromEntries(AXES.map((axis) => [axis, corner[axis] / 2 + inset[axis] * WINDING_TEST_BEVEL])));
}

/** The triangle as given, or turned over if it faced the middle of the box. The box is convex, so outwards is away from its centre. */
function woundOutwards(triangle: Triple): Triple {
  const [a, b, c] = triangle.map(placeForWinding);
  const [u, v] = [AXES.map((axis) => b[axis] - a[axis]), AXES.map((axis) => c[axis] - a[axis])];
  const facing = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const outwards = AXES.reduce<number>((sum, axis) => sum + facing[axis] * (a[axis] + b[axis] + c[axis]), 0);
  return outwards > 0 ? triangle : [triangle[0], triangle[2], triangle[1]];
}

/** A unit box with a strip along every edge and a triangle at every corner: 24 vertices, 44 triangles. */
export function bevelledBlock(): BevelledBlock {
  const quads = [...faceQuads(), ...edgeQuads()];
  const corners = CORNERS.map((corner): Triple => [vertexAt(corner, 0), vertexAt(corner, 1), vertexAt(corner, 2)]);
  const triangles = [...quads.flatMap(([a, b, c, d]): Triple[] => [[a, b, c], [a, c, d]]), ...corners];
  return {
    positions: CORNERS.flatMap((corner) => AXES.flatMap(() => corner.map((sign) => sign / 2))),
    normals: CORNERS.flatMap((corner) => AXES.flatMap((faceAxis) => AXES.map((axis) => (axis === faceAxis ? corner[axis] : 0)))),
    triangles: triangles.flatMap(woundOutwards),
  };
}
