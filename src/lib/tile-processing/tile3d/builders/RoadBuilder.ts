import Vec2 from "~/lib/math/Vec2";

export enum RoadSide {
	Both,
	Left,
	Right
}

/**
 * Generates geometry for a road mesh from a polyline of 2D vertices.
 * Each vertex produces a set of control points.
 * Segments are quads connecting the forward edge of one vertex to the backward edge of the next.
 * Connections are triangular fills at corners between adjacent segments.
 */
export default class RoadBuilder {
	public static build(
		{
			vertices,
			vertexAdjacentToStart,
			vertexAdjacentToEnd,
			offset = 0,
			width,
			uvFollowRoad,
			uvScale = 1,
			uvScaleY = 1,
			side = RoadSide.Both,
			uvMinX = 0,
			uvMaxX = 1
		}: {
			vertices: Vec2[];
			// Used to calculate the incoming tangent/angle if the road connects to an existing path
			vertexAdjacentToStart?: Vec2;
			vertexAdjacentToEnd?: Vec2;
			offset?: number;
			width: number;
			// If true, UVs run along the road; if false, UVs are derived from world-space XZ positions.
			uvFollowRoad: boolean;
			uvScale?: number;
			uvScaleY?: number;
			side?: RoadSide;
			uvMinX?: number;
			uvMaxX?: number;
		}
	): {position: number[]; uv: number[]; border: Vec2[]} {
		const isClosed = vertices[0].equals(vertices[vertices.length - 1]);
		const points = [...vertices];

		if (isClosed) {
			points.pop();
		}
			
		const controlPoints = this.getControlPoints(points, isClosed, offset, width, vertexAdjacentToStart, vertexAdjacentToEnd);
		const border = this.getBorderVertices(controlPoints, isClosed);
		const geometry = this.buildSegmentsFromControlPoints(
			controlPoints,
			isClosed,
			uvScaleY,
			uvMinX,
			uvMaxX,
			side);

		if (!uvFollowRoad) {
			this.fillUVsFromPositions(geometry.uv, geometry.position, uvScale);
		}

		return {
			position: geometry.position,
			uv: geometry.uv,
			border: border
		};
	}

	/**
	 * Builds a closed polyline tracing the outer border of the road (left edge forward, right edge backward).
	 */
	private static getBorderVertices(controlPoints: Vec2[][], isClosed: boolean): Vec2[] {
		const segmentCount = controlPoints.length - (isClosed ? 0 : 1);
		const border: Vec2[] = [];

		for (let i = 0; i < segmentCount; i++) {
			const current = controlPoints[i];
			const next = controlPoints[(i + 1) % controlPoints.length];

			if (current[4]) {
				// Inner corner point goes on the side it belongs to (left or right border)
				const inverse = current[2].equals(current[0]);

				if (inverse) {
					border.unshift(current[4]);
				} else {
					border.push(current[4]);
				}
			}

			// Forward: left edges; backward: right edges
			border.push(current[0], next[2]);
			border.unshift(next[3], current[1]);
		}

		border.push(border[0]);

		return border;
	}

	/**
	 * Emits the triangle(s) for a connection fan at the start side of a corner.
	 * "Inverse" means the inner corner is on the left side (the turn bends right).
	 */
	private static buildConnectionAttributesStart(
		controlPoint: Vec2[],
		side: RoadSide,
		start: number,
		end: number,
		isInverse: boolean,
		uvMinX: number,
		uvMaxX: number,
		uvScaleY: number,
		position: number[],
		uv: number[]
	): void {
		if (side === RoadSide.Both) {
			const c0uv = [uvMinX, end / uvScaleY];
			const c1uv = [uvMaxX, end / uvScaleY];
			const c4uv = [isInverse ? uvMaxX : uvMinX, start / uvScaleY];

			position.push(
				controlPoint[0].x, 0, controlPoint[0].y,
				controlPoint[1].x, 0, controlPoint[1].y,
				controlPoint[4].x, 0, controlPoint[4].y
			);
			uv.push(
				...c0uv,
				...c1uv,
				...c4uv
			);

			return;
		}

		// When rendering only one side, split the connection triangle along the road center
		const uvMidX = (uvMinX + uvMaxX) / 2;
		const midEnd = Vec2.multiplyScalar(Vec2.add(controlPoint[0], controlPoint[1]), 0.5);
		const midCenter = isInverse ?
			Vec2.multiplyScalar(Vec2.add(controlPoint[2], controlPoint[4]), 0.5) :
			Vec2.multiplyScalar(Vec2.add(controlPoint[1], controlPoint[4]), 0.5);

		const midEndUV = [uvMidX, end / uvScaleY];
		const midCenterUV = [uvMidX, ((start + end) / 2) / uvScaleY];

		const c0uv = [uvMinX, end / uvScaleY];
		const c1uv = [uvMaxX, end / uvScaleY];
		const c4uv = [isInverse ? uvMaxX : uvMinX, start / uvScaleY];

		const clipLeft = side === RoadSide.Left;

		if (clipLeft === isInverse) {
			position.push(
				midCenter.x, 0, midCenter.y,
				midEnd.x, 0, midEnd.y,
				controlPoint[4].x, 0, controlPoint[4].y
			);
			const t2 = !isInverse ? controlPoint[0] : controlPoint[1];
			const t2uv = !isInverse ? c0uv : c1uv;
			position.push(
				midEnd.x, 0, midEnd.y,
				t2.x, 0, t2.y,
				controlPoint[4].x, 0, controlPoint[4].y
			);

			uv.push(
				...midCenterUV,
				...midEndUV,
				...c4uv,

				...midEndUV,
				...t2uv,
				...c4uv
			);
		} else {
			const t = !isInverse ? controlPoint[1] : controlPoint[0];
			const tuv = !isInverse ? c1uv : c0uv;
			position.push(
				midCenter.x, 0, midCenter.y,
				t.x, 0, t.y,
				midEnd.x, 0, midEnd.y
			);
			uv.push(
				...midCenterUV,
				...tuv,
				...midEndUV
			);
		}
	}

	/**
	 * Emits the triangle(s) for a connection fan at the end side of a corner.
	 */
	private static buildConnectionAttributesEnd(
		controlPoint: Vec2[],
		side: RoadSide,
		start: number,
		end: number,
		isInverse: boolean,
		uvMinX: number,
		uvMaxX: number,
		uvScaleY: number,
		position: number[],
		uv: number[]
	): void {
		if (side === RoadSide.Both) {
			const c2uv = [uvMinX, start / uvScaleY];
			const c3uv = [uvMaxX, start / uvScaleY];
			const c4uv = [isInverse ? uvMaxX : uvMinX, end / uvScaleY];

			position.push(
				controlPoint[2].x, 0, controlPoint[2].y,
				controlPoint[3].x, 0, controlPoint[3].y,
				controlPoint[4].x, 0, controlPoint[4].y
			);
			uv.push(
				...c2uv,
				...c3uv,
				...c4uv
			);

			return;
		}

		const uvMidX = (uvMinX + uvMaxX) / 2;
		const midStart = Vec2.multiplyScalar(Vec2.add(controlPoint[2], controlPoint[3]), 0.5);
		const midCenter = isInverse ?
			Vec2.multiplyScalar(Vec2.add(controlPoint[2], controlPoint[4]), 0.5) :
			Vec2.multiplyScalar(Vec2.add(controlPoint[1], controlPoint[4]), 0.5);

		const midStartUV = [uvMidX, start / uvScaleY];
		const midCenterUV = [uvMidX, ((start + end) / 2) / uvScaleY];

		const c2uv = [uvMinX, start / uvScaleY];
		const c3uv = [uvMaxX, start / uvScaleY];
		const c4uv = [isInverse ? uvMaxX : uvMinX, end / uvScaleY];

		const clipLeft = side === RoadSide.Left;

		if (clipLeft === isInverse) {
			position.push(
				midStart.x, 0, midStart.y,
				midCenter.x, 0, midCenter.y,
				controlPoint[4].x, 0, controlPoint[4].y
			);
			const t1 = !isInverse ? controlPoint[2] : controlPoint[3];
			const t1uv = !isInverse ? c2uv : c3uv;
			position.push(
				midStart.x, 0, midStart.y,
				controlPoint[4].x, 0, controlPoint[4].y,
				t1.x, 0, t1.y
			);

			uv.push(
				...midStartUV,
				...midCenterUV,
				...c4uv,

				...midStartUV,
				...c4uv,
				...t1uv
			);
		} else {
			const t = !isInverse ? controlPoint[3] : controlPoint[2];
			const tuv = !isInverse ? c3uv : c2uv;
			position.push(
				midStart.x, 0, midStart.y,
				t.x, 0, t.y,
				midCenter.x, 0, midCenter.y
			);

			uv.push(
				...midStartUV,
				...tuv,
				...midCenterUV,
			);
		}
	}

	/**
	 * Emits a connection (corner fan triangle) if the control point has an inner corner [4].
	 * Returns the updated UV progress along the road.
	 */
	private static buildConnection(
		controlPoint: Vec2[],
		side: RoadSide,
		uvProgress: number,
		uvMinX: number,
		uvMaxX: number,
		uvScaleY: number,
		position: number[],
		uv: number[],
		type: 'start' | 'end'
	): number {
		if (!controlPoint[4]) {
			return uvProgress;
		}

		const isInverse = controlPoint[2].equals(controlPoint[0]);
		const triLength = Vec2.getLength(Vec2.sub(controlPoint[4], !isInverse ? controlPoint[0] : controlPoint[1]));

		const start = uvProgress;
		const end = start + triLength;

		if (type === 'start') {
			this.buildConnectionAttributesStart(
				controlPoint,
				side,
				start,
				end,
				isInverse,
				uvMinX,
				uvMaxX,
				uvScaleY,
				position,
				uv
			);
		} else {
			this.buildConnectionAttributesEnd(
				controlPoint,
				side,
				start,
				end,
				isInverse,
				uvMinX,
				uvMaxX,
				uvScaleY,
				position,
				uv
			);
		}

		return end;
	}

	/**
	 * Emits a quad between two adjacent control points.
	 * Returns the updated UV progress.
	 */
	private static buildSegment(
		controlPointFrom: Vec2[],
		controlPointTo: Vec2[],
		side: RoadSide,
		uvProgress: number,
		uvMinX: number,
		uvMaxX: number,
		uvScaleY: number,
		position: number[],
		uv: number[],
	): number {
		const a = controlPointFrom[0]; // left, forward edge of start
		const b = controlPointFrom[1]; // right, forward edge of start
		const c = controlPointTo[2];   // left, backward edge of end
		const d = controlPointTo[3];   // right, backward edge of end

		const segmentLength = Vec2.getLength(Vec2.sub(a, c));
		const uvStart = uvProgress;
		const uvEnd = uvProgress + segmentLength;

		if (side === RoadSide.Both) {
			position.push(
				a.x, 0, a.y,
				b.x, 0, b.y,
				c.x, 0, c.y
			);
			position.push(
				b.x, 0, b.y,
				d.x, 0, d.y,
				c.x, 0, c.y
			);

			uv.push(
				uvMinX, uvStart / uvScaleY,
				uvMaxX, uvStart / uvScaleY,
				uvMinX, uvEnd / uvScaleY
			);
			uv.push(
				uvMaxX, uvStart / uvScaleY,
				uvMaxX, uvEnd / uvScaleY,
				uvMinX, uvEnd / uvScaleY
			);
		} else {
			// Only emit the left or right half of the quad, split along the centerline
			const midStart = Vec2.multiplyScalar(Vec2.add(c, d), 0.5);
			const midEnd = Vec2.multiplyScalar(Vec2.add(a, b), 0.5);
			const uvMidX = (uvMinX + uvMaxX) / 2;

			if (side === RoadSide.Left) {
				position.push(
					b.x, 0, b.y,
					midEnd.x, 0, midEnd.y,
					d.x, 0, d.y
				);
				position.push(
					midEnd.x, 0, midEnd.y,
					midStart.x, 0, midStart.y,
					d.x, 0, d.y
				);

				uv.push(
					uvMaxX, uvStart / uvScaleY,
					uvMidX, uvStart / uvScaleY,
					uvMaxX, uvEnd / uvScaleY
				);
				uv.push(
					uvMidX, uvStart / uvScaleY,
					uvMidX, uvEnd / uvScaleY,
					uvMaxX, uvEnd / uvScaleY
				);
			} else {
				position.push(
					a.x, 0, a.y,
					midEnd.x, 0, midEnd.y,
					c.x, 0, c.y
				);
				position.push(
					midEnd.x, 0, midEnd.y,
					midStart.x, 0, midStart.y,
					c.x, 0, c.y
				);

				uv.push(
					uvMinX, uvStart / uvScaleY,
					uvMidX, uvStart / uvScaleY,
					uvMinX, uvEnd / uvScaleY
				);
				uv.push(
					uvMidX, uvStart / uvScaleY,
					uvMidX, uvEnd / uvScaleY,
					uvMinX, uvEnd / uvScaleY
				);
			}
		}

		return uvEnd;
	}

	/**
	 * Iterates over all segments, emitting connection–segment–connection triples
	 * and accumulating UV progress along the road length.
	 */
	private static buildSegmentsFromControlPoints(
		controlPoints: Vec2[][],
		isClosed: boolean,
		uvScaleY: number,
		uvMinX: number,
		uvMaxX: number,
		side: RoadSide,
	): {position: number[]; uv: number[]} {
		const position: number[] = [];
		const uv: number[] = [];

		const segmentCount = controlPoints.length - (isClosed ? 0 : 1);
		let uvProgress = 0;

		for (let i = 0; i < segmentCount; i++) {
			const current = controlPoints[i];
			const next = controlPoints[(i + 1) % controlPoints.length];

			uvProgress = this.buildConnection(
				current,
				side,
				uvProgress,
				uvMinX,
				uvMaxX,
				uvScaleY,
				position,
				uv,
				'start'
			);

			uvProgress = this.buildSegment(
				current,
				next,
				side,
				uvProgress,
				uvMinX,
				uvMaxX,
				uvScaleY,
				position,
				uv,
			);

			uvProgress = this.buildConnection(
				next,
				side,
				uvProgress,
				uvMinX,
				uvMaxX,
				uvScaleY,
				position,
				uv,
				'end'
			);
		}

		return {position, uv};
	}

	/** Overwrites UVs with world-space XZ coordinates divided by scale. */
	private static fillUVsFromPositions(uv: number[], position: number[], scale: number): void {
		for (let i = 0, j = 0; i < uv.length; i += 2, j += 3) {
			const px = position[j];
			const pz = position[j + 2];

			uv[i] = px / scale;
			uv[i + 1] = pz / scale;
		}
	}

	/**
	 * Calculates shifted points for each vertex to give the road width.
	 * Handles generating miter joints at sharp corners.
	 * Each vertex returns 5 points (4 when vextex is an endpoint): [startLeft, startRight, endLeft, endRight, innerCornerPivot]
	 */
	private static getControlPoints(
		vertices: Vec2[],
		isClosed: boolean,
		offset: number,
		width: number,
		vertexAdjacentToStart?: Vec2,
		vertexAdjacentToEnd?: Vec2
	): Vec2[][] {
		const controlPoints: Vec2[][] = [];

		for (let i = 0; i < vertices.length; i++) {
			const current = vertices[i];
			let prev = vertices[i - 1];
			let next = vertices[i + 1];

			if (isClosed) {
				if (!prev) {
					prev = vertices[vertices.length - 1];
				}
				if (!next) {
					next = vertices[0];
				}
			} else {
				if (!prev && vertexAdjacentToStart) {
					prev = vertexAdjacentToStart;
				}
				if (!next && vertexAdjacentToEnd) {
					next = vertexAdjacentToEnd;
				}
			}

			let vA: Vec2, vB: Vec2;

			if (prev) {
				vA = Vec2.sub(current, prev);
			}
			if (next) {
				vB = Vec2.sub(next, current);
			}

			// Fall back to duplicating the available direction when at an endpoint
			if (!vA) vA = Vec2.clone(vB);
			if (!vB) vB = Vec2.clone(vA);

			const aNorm = Vec2.normalize(vA);
			const bNorm = Vec2.normalize(vB);

			const leftA = Vec2.rotateLeft(aNorm);
			const leftB = Vec2.rotateLeft(bNorm);
			
			const alpha = Math.atan2(bNorm.y, bNorm.x) - Math.atan2(aNorm.y, aNorm.x); // Angle between a and b
			const alphaFixed = alpha < 0 ? alpha + Math.PI * 2 : alpha;
			const offsetDirection = Vec2.normalize(Vec2.add(leftA, leftB));

			const nominalLeft = offset + width / 2;
			const nominalRight = offset - width / 2;

			// On sharp corners edge may extend very far out. This clamps it to a max.
			const miterFactor = Math.min(1 / Math.abs(Math.cos(alpha / 2)), 10);
					
			const offsetLenLeftAbs = (!prev && !next) ? nominalLeft : nominalLeft * miterFactor;
			const offsetLenRightAbs = (!prev && !next) ? nominalRight : nominalRight * miterFactor;

			// When the turn angle >= 180°, the inner corner flips to the other side (inverse true means turn left)
			const inverse = alphaFixed >= Math.PI;

			const pointLeft = Vec2.add(current, Vec2.multiplyScalar(offsetDirection, offsetLenLeftAbs));
			const pointRight = Vec2.add(current, Vec2.multiplyScalar(offsetDirection, offsetLenRightAbs));
			
			const offsetCentre = Vec2.add(current, Vec2.multiplyScalar(offsetDirection, (offsetLenLeftAbs + offsetLenRightAbs) / 2))

			// Mirror the outer miter point across each edge direction to get clamped edge endpoints
			const mirroredA = this.reflectPoint(inverse ? pointRight : pointLeft, offsetCentre, Vec2.add(offsetCentre, aNorm));
			const mirroredB = this.reflectPoint(inverse ? pointRight : pointLeft, offsetCentre, Vec2.add(offsetCentre, bNorm));

			const p0 = inverse ? mirroredB : pointLeft; //startLeft
			const p1 = inverse ? pointRight : mirroredB; //startRight
			const p2 = inverse ? mirroredA : pointLeft; //endLeft
			const p3 = inverse ? pointRight : mirroredA; //endRight
			const p4 = inverse ? pointLeft : pointRight; //innerCornerPivot

			if (!prev || !next) {
				controlPoints.push([p0, p1, p2, p3]);
			} else {
				controlPoints.push([p0, p1, p2, p3, p4]);
			}
		}

		return controlPoints;
	}

	private static calculateSlope(lineStart: Vec2, lineEnd: Vec2): number {
		return (lineEnd.y - lineStart.y) / (lineEnd.x - lineStart.x);
	}

	private static calculateYIntercept(lineStart: Vec2, lineEnd: Vec2): number {
		return (lineEnd.x * lineStart.y - lineStart.x * lineEnd.y) / (lineEnd.x - lineStart.x)
	}

	/** Reflects a point across the line defined by lineStart -> lineEnd. */
	private static reflectPoint(point: Vec2, lineStart: Vec2, lineEnd: Vec2): Vec2 {
		// Handle vertical line to avoid division by zero
		if (lineEnd.x - lineStart.x === 0) {
			return new Vec2(2 * lineEnd.x - point.x, point.y);
		}

		const m = this.calculateSlope(lineStart, lineEnd);
		const c = this.calculateYIntercept(lineStart, lineEnd);
		const d = (point.x + (point.y - c) * m) / (1 + m * m);

		return new Vec2(
			2 * d - point.x,
			2 * d * m - point.y + 2 * c
		);
	}
}