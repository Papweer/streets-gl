import Handler, {RequestedHeightParams} from "~/lib/tile-processing/tile3d/handlers/Handler";
import Tile3DFeature from "~/lib/tile-processing/tile3d/features/Tile3DFeature";
import VectorPolyline from "~/lib/tile-processing/vector/features/VectorPolyline";
import OSMReference from "~/lib/tile-processing/vector/features/OSMReference";
import Tile3DProjectedGeometry, {getZIndex} from "~/lib/tile-processing/tile3d/features/Tile3DProjectedGeometry";
import Vec2 from "~/lib/math/Vec2";
import Tile3DProjectedGeometryBuilder from "~/lib/tile-processing/tile3d/builders/Tile3DProjectedGeometryBuilder";
import {Tile3DRingType} from "~/lib/tile-processing/tile3d/builders/Tile3DRing";
import Tile3DHuggingGeometry from "~/lib/tile-processing/tile3d/features/Tile3DHuggingGeometry";
import {RoadSide} from "~/lib/tile-processing/tile3d/builders/RoadBuilder";
import RoadGraph from "~/lib/road-graph/RoadGraph";
import Road from "~/lib/road-graph/Road";
import Intersection, {IntersectionDirection} from "~/lib/road-graph/Intersection";
import {VectorAreaDescriptor, VectorPolylineDescriptor} from "~/lib/tile-processing/vector/qualifiers/descriptors";
import {ProjectedTextures} from "~/lib/tile-processing/tile3d/textures";
import getPathParams from "./helpers/getPathParams";

export default class VectorPolylineHandler implements Handler {
	private readonly osmReference: OSMReference;
	private readonly descriptor: VectorPolylineDescriptor;
	private readonly vertices: Vec2[];
	private mercatorScale: number = 1;
	private graph: RoadGraph = null;
	private graphRoad: Road = null;
	private graphGroup: number = -1;

	public constructor(feature: VectorPolyline) {
		this.osmReference = feature.osmReference;
		this.descriptor = feature.descriptor;
		this.vertices = feature.nodes.map(node => new Vec2(node.x, node.y));
	}

	public getRequestedHeightPositions(): RequestedHeightParams {
		return null;
	}

	public setMercatorScale(scale: number): void {
		this.mercatorScale = scale;
	}

	public getFeatures(): Tile3DFeature[] {
		switch (this.descriptor.type) {
			case 'path': {
				return this.handlePath();
			}
			case 'fence': {
				return [this.handleFence()];
			}
			case 'wall': {
				return [this.handleWall()];
			}
			case 'waterway': {
				return [this.handleWaterway()];
			}
			case 'parkingSpace': {
				return [this.handleParkingSpace()];
			}
		}

		return [];
	}

	public setRoadGraph(graph: RoadGraph): void {
		if (this.descriptor.type === 'path') {
			let type = -1;

			switch (this.descriptor.pathType) {
				case 'roadway':
					type = 0;
					break;
				case 'footway':
					type = 1;
					break;
				case 'cycleway':
					type = 2;
					break;
				case 'railway':
					type = 3;
					break;
				case 'tramway':
					type = 4;
					break;
			}

			if (type !== -1) {
				this.graph = graph;
				this.graphGroup = type;
				this.graphRoad = graph.addRoad(this.vertices, this.descriptor.width * this.mercatorScale, type);
			}
		}
	}

	public getGraphRoad(): Road {
		return this.graphRoad;
	}

	private handlePath(): Tile3DFeature[] {
		const features: Tile3DFeature[] = [];
		const side = VectorPolylineHandler.getRoadSideFromDescriptor(this.descriptor.side);
		const params = getPathParams(
			this.descriptor.pathType,
			this.descriptor.pathMaterial,
			this.descriptor.width,
			this.mercatorScale
		);
		const offset = (this.descriptor.offset == null) ? 0 : this.descriptor.offset;
		const {vertices, vertexAdjacentToStart, vertexAdjacentToEnd} = this.getPathBuilderVertices();

		if (vertices.length < 2) {
			return features;
		}

		for (const path of params) {
			const builder = new Tile3DProjectedGeometryBuilder();
			builder.setZIndex(path.zIndex);
			builder.addRing(Tile3DRingType.Outer, vertices);

			if (!this.descriptor.hasArea) {
				builder.addPath({
					offset: offset * this.mercatorScale,
					width: this.descriptor.width * this.mercatorScale * path.widthScale,
					uvMinX: path.uvMinX,
					uvMaxX: path.uvMaxX,
					textureId: path.textureId,
					uvFollowRoad: path.uvFollowRoad,
					uvScale: path.uvScale,
					uvScaleY: path.uvScaleY,
					side,
					vertexAdjacentToStart,
					vertexAdjacentToEnd,
					addMask: (this.descriptor.pathType == "footway" ? false : true)
				});
			}

			const markingBuilder = new Tile3DProjectedGeometryBuilder();
			markingBuilder.setZIndex(getZIndex("Road", "RoadMarking"))
			markingBuilder.addRing(Tile3DRingType.Outer, vertices);

			// Build lane markings
			if (this.descriptor.isRoadwayMarked && (this.descriptor.pathType == "roadway")) {			
				// TODO - Don't assume right-hand side drive
				for (let i = 1; i<this.descriptor.lanes; i++) {
					markingBuilder.addPath({
						width: 0.1 * this.mercatorScale,
						offset: ((this.descriptor.width/this.descriptor.lanes)*i - (this.descriptor.width/2)) * this.mercatorScale,
						textureId: ProjectedTextures.RoadMarking,
						uvFollowRoad: true,
						vertexAdjacentToStart,
						vertexAdjacentToEnd
					});
				}
			}

			features.push(builder.getGeometry());
			features.push(markingBuilder.getGeometry());

			if (path.needsUsageMask) {
				features.push(builder.getTerrainMaskGeometry());
			}
		}

		return features;
	}

	private getPathBuilderVertices(): {
		vertices: Vec2[];
		vertexAdjacentToStart: Vec2;
		vertexAdjacentToEnd: Vec2;
	} {
		const vertices: Vec2[] = [...this.vertices];
		const pointStart = vertices[0];
		const pointEnd = vertices[vertices.length - 1];

		let vertexAdjacentToStart: Vec2 = null;
		let vertexAdjacentToEnd: Vec2 = null;

		if (!pointStart.equals(pointEnd) && this.graphRoad) {
			const intersectionStart = this.graphRoad.start.getIntersection();
			const intersectionEnd = this.graphRoad.end.getIntersection();

			if (intersectionStart && vertices.length > 1) {
				vertexAdjacentToStart = this.processPathEnd(vertices, intersectionStart, 'first');
			}
			if (intersectionEnd && vertices.length > 1) {
				vertexAdjacentToEnd = this.processPathEnd(vertices, intersectionEnd, 'last');
			}
		}

		return {
			vertices,
			vertexAdjacentToStart,
			vertexAdjacentToEnd
		};
	}

	private processPathEnd(vertices: Vec2[], intersection: Intersection, type: 'first' | 'last'): Vec2 {
		let adjacentVertex: Vec2 = null;

		if (intersection.directions.length === 2) {
			for (const {road, vertex} of intersection.directions) {
				const prevVertexIndex = type === 'first' ? 1 : vertices.length - 2;

				if (
					road !== this.graphRoad &&
					!vertex.vector.equals(vertices[prevVertexIndex])
				) {
					adjacentVertex = vertex.vector;
				}
			}
		} else if (intersection.directions.length > 2 && !intersection.userData.skip) {
			const dir = intersection.directions.find((dir: IntersectionDirection) => dir.road === this.graphRoad);

			if (dir && dir.trimmedEnd && vertices.length > 1) {
				const prevVertexIndex = type === 'first' ? 1 : vertices.length - 2;

				if (dir.trimmedEnd.equals(vertices[prevVertexIndex])) {
					if (type === 'first') {
						adjacentVertex = vertices[0];
						vertices.shift();
					} else {
						adjacentVertex = vertices[vertices.length - 1];
						vertices.pop();
					}
				} else {
					const vertexIndex = type === 'first' ? 0 : vertices.length - 1;

					vertices[vertexIndex].set(dir.trimmedEnd.x, dir.trimmedEnd.y);
				}
			}
		}

		return adjacentVertex;
	}

	private handleFence(): Tile3DHuggingGeometry {
		const builder = new Tile3DProjectedGeometryBuilder();
		builder.addRing(Tile3DRingType.Outer, this.vertices);

		const {width, textureId} = VectorPolylineHandler.getFenceParams(
			this.descriptor.material,
			this.descriptor.height
		);

		builder.addFence({
			minHeight: (this.descriptor.minHeight ?? 0) * this.mercatorScale,
			height: this.descriptor.height * this.mercatorScale,
			width: width,
			textureId: textureId
		});

		const result = builder.getGeometry();
		return {...result, type: 'hugging'};
	}

	private handleWall(): Tile3DHuggingGeometry {
		const builder = new Tile3DProjectedGeometryBuilder();
		builder.addRing(Tile3DRingType.Outer, this.vertices);

		const params = VectorPolylineHandler.getWallParams(this.descriptor.material);
		
		builder.addExtrudedPath({
			width: 0.8 * this.mercatorScale,
			height: this.descriptor.height * this.mercatorScale,
			textureId: params.textureId,
			textureScaleX: params.uvScaleX,
			textureScaleY: params.uvScaleY
		});

		const result = builder.getGeometry();
		return {...result, type: 'hugging'};
	}

	private handleWaterway(): Tile3DProjectedGeometry {
		const builder = new Tile3DProjectedGeometryBuilder();
		builder.setZIndex(getZIndex("Landcover", "Waterway"));
		builder.addRing(Tile3DRingType.Outer, this.vertices);
		builder.addPath({
			width: this.descriptor.width * this.mercatorScale,
			uvFollowRoad: false,
			textureId: ProjectedTextures.Water
		});

		return builder.getGeometry();
	}

	private handleParkingSpace(): Tile3DProjectedGeometry {
		const builder = new Tile3DProjectedGeometryBuilder();
		builder.setZIndex(getZIndex("Road", "RoadMarking"));
		builder.addRing(Tile3DRingType.Outer, this.vertices);

		builder.addPath({
			width: 0.1 * this.mercatorScale, // TODO
			uvFollowRoad: false,
			uvScale: 1,
			textureId: ProjectedTextures.RoadMarking,
		});

		return builder.getGeometry();
	}
	
	public getIntersectionMaterial(): VectorAreaDescriptor['pathMaterial'] {
		return this.descriptor.pathMaterial;
	}

	private static getRoadSideFromDescriptor(descriptorValue: VectorPolylineDescriptor['side']): RoadSide {
		if (descriptorValue === 'left') {
			return RoadSide.Left;
		}

		if (descriptorValue === 'right') {
			return RoadSide.Right;
		}

		return RoadSide.Both;
	}

	private static getFenceParams(
		type: VectorPolylineDescriptor['material'],
		height: number
	): {
		textureId: number;
		width: number;
	} {
		const textureTable: Record<VectorPolylineDescriptor['material'], {
			textureId: number;
			widthRatio: number;
		}> = {
			wood: {textureId: ProjectedTextures.WoodFence, widthRatio: 1},
			concrete: {textureId: ProjectedTextures.ConcreteFence, widthRatio: 2},
			chainLink: {textureId: ProjectedTextures.ChainLinkFence, widthRatio: 1},
			metal: {textureId: ProjectedTextures.MetalFence, widthRatio: 1.64}
		};

		const entry = textureTable[type];

		return {
			textureId: entry.textureId,
			width: height * entry.widthRatio
		};
	}

	private static getWallParams(
		type: VectorPolylineDescriptor['material']
	): {
		textureId: number;
		uvScaleX: number;
		uvScaleY: number;
	} {
		const textureTable: Record<VectorPolylineDescriptor['material'], {
			textureId: number;
			scaleX: number;
			scaleY: number;
		}> = {
			stone: {textureId: ProjectedTextures.StoneWall, scaleX: 4, scaleY: 4},
			concrete: {textureId: ProjectedTextures.ConcreteWall, scaleX: 4.5, scaleY: 3},
			hedge: {textureId: ProjectedTextures.Hedge, scaleX: 3, scaleY: 3},
		};

		const entry = textureTable[type];

		return {
			textureId: entry.textureId,
			uvScaleX: entry.scaleX,
			uvScaleY: entry.scaleY
		};
	}
}