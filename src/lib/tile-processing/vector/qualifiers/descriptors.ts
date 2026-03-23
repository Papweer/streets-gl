import {OMBBResult} from "~/lib/tile-processing/tile3d/builders/Tile3DMultipolygon";
import Vec3 from "~/lib/math/Vec3";

type TreeType = 'broadleaved' | 'needleleaved' | 'beech' | 'fir' | 'linden' | 'oak' | string;

export interface VectorNodeDescriptor {
	type?: 'tree' | 'rock' | 'hydrant' | 'transmissionTower' | 'utilityPole' | 'artwork' | 'adColumn' | 'windTurbine' |
	'bench' | 'picnicTable' | 'busStop' | 'memorial' | 'statue' | 'sculpture';
	treeType?: TreeType;
	direction?: number;
	height?: number;
	minHeight?: number;
}

export interface VectorPolylineDescriptor {
	type: 'path' | 'fence' | 'wall' | 'powerLine' | 'waterway' | 'parkingSpace' | string;
	pathType?: 'roadway' | 'footway' | 'cycleway' | 'railway' | 'tramway' | 'runway' | string;
	pathMaterial?: 'asphalt' | 'concrete' | 'dirt' | 'sand' | 'gravel' | 'cobblestone' | 'wood' | string;
	isRoadwayMarked?: boolean;
	material?: 'wood' | 'chainLink' | 'metal' | 'concrete' | 'stone' | 'concrete' | 'hedge' | string;
	width?: number;
	height?: number;
	minHeight?: number;
	lanesForward?: number;
	lanesBackward?: number;
	side?: string;
}

export interface VectorAreaDescriptor {
	label?: string;
	type: 'building' | 'buildingPart' | 'asphalt' | 'roadwayIntersection' | 'pavement' | 'water' | 'farmland' |
		'grass' | 'sand' | 'rock' | 'pitch' | 'manicuredGrass' | 'helipad' | 'forest' | 'garden' | 'construction' |
		'buildingConstruction' | 'shrubbery' | 'pathArea';
	pathMaterial?: 'asphalt' | 'concrete' | 'dirt' | 'sand' | 'gravel' | 'cobblestone' | 'wood' | string;
	pitchType?: 'generic' | 'football' | 'basketball' | 'tennis';
	treeType?: TreeType;
	buildingLevels?: number;
	buildingHeight?: number;
	buildingMinHeight?: number;
	buildingRoofHeight?: number;
	buildingRoofType?: 'flat' | 'hipped' | 'gabled' | 'gambrel' | 'pyramidal' | 'onion' | 'dome' | 'round' |
		'skillion' | 'mansard' | 'quadrupleSaltbox' | 'saltbox';
	buildingRoofOrientation?: 'along' | 'across';
	buildingRoofDirection?: number;
	buildingRoofAngle?: number;
	buildingFacadeMaterial?: 'plaster' | 'brick' | 'wood' | 'glass' | 'cementBlock';
	buildingFacadeColor?: number;
	buildingRoofMaterial?: 'default' | 'tiles' | 'metal' | 'concrete' | 'thatch' | 'eternit' | 'grass' | 'glass' |
		'tar';
	buildingRoofColor?: number;
	buildingWindows?: boolean;
	buildingFoundation?: boolean;
	ombb?: OMBBResult;
	poi?: Vec3;
}

export type VectorDescriptor = VectorNodeDescriptor | VectorAreaDescriptor | VectorPolylineDescriptor;