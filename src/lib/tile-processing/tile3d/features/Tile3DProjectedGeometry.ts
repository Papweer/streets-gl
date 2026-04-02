import Tile3DFeature from "~/lib/tile-processing/tile3d/features/Tile3DFeature";
import AABB3D from "~/lib/math/AABB3D";

const ZIndexTypeMap = {
	Landcover: 0,
	Footway: 1,
	Road: 2,
	Intersection: 3,
	Railway: 4,
} as const satisfies Record<string, number>;

const ZIndexMaterialMap = {
	Water: 0,
	Grass: 1,
	Dirt: 2,
	Sand: 3,
	Rock: 4,
	Wood: 5,
	Cobblestone: 6,
	Asphalt: 7,
	Concrete: 8,
	Cycleway: 9,
	RoadMarking: 10, 
	Construction: 11,
	Farmland: 12,
	ManicuredGrass: 13,
	Garden: 14,
	Pitch: 15,
	ShrubberySoil: 16,
	Waterway: 17,
	Runway: 18,
	Railway: 19,
	RailwayOverlay: 20,
	Rail: 21,
	Helipad: 22
} as const satisfies Record<string, number>;

export function getZIndex(type: keyof typeof ZIndexTypeMap, material: keyof typeof ZIndexMaterialMap): number {
	return ZIndexTypeMap[type] * 100 + ZIndexMaterialMap[material];
}

export default interface Tile3DProjectedGeometry extends Tile3DFeature {
	type: 'projected';
	zIndex: number;
	boundingBox: AABB3D;
	positionBuffer: Float32Array;
	normalBuffer: Float32Array;
	uvBuffer: Float32Array;
	textureIdBuffer: Uint8Array;
}