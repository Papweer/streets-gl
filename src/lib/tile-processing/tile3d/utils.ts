import MathUtils from "~/lib/math/MathUtils";
import Tile3DExtrudedGeometry from "~/lib/tile-processing/tile3d/features/Tile3DExtrudedGeometry";
import Tile3DBuffers from "~/lib/tile-processing/tile3d/buffers/Tile3DBuffers";
import {VectorNodeDescriptor} from "~/lib/tile-processing/vector/qualifiers/descriptors";

export function applyMercatorFactorToExtrudedFeatures(extruded: Tile3DExtrudedGeometry[], x: number, y: number, zoom: number): void {
	const scale = MathUtils.getMercatorScaleFactorForTile(x, y, zoom);

	for (const geometry of extruded) {
		geometry.boundingBox.min.y *= scale;
		geometry.boundingBox.max.y *= scale;

		for (let i = 1; i < geometry.positionBuffer.length; i += 3) {
			geometry.positionBuffer[i] *= scale;
		}
	}
}

export function getTile3DBuffersTransferables(buffers: Tile3DBuffers): Transferable[] {
	const transferables: Transferable[] = [
		buffers.extruded.positionBuffer.buffer,
		buffers.extruded.uvBuffer.buffer,
		buffers.extruded.normalBuffer.buffer,
		buffers.extruded.textureIdBuffer.buffer,
		buffers.extruded.colorBuffer.buffer,
		buffers.extruded.idBuffer.buffer,
		buffers.extruded.offsetBuffer.buffer,
		buffers.extruded.localIdBuffer.buffer,
		buffers.projected.positionBuffer.buffer,
		buffers.projected.normalBuffer.buffer,
		buffers.projected.uvBuffer.buffer,
		buffers.projected.textureIdBuffer.buffer,
		buffers.hugging.positionBuffer.buffer,
		buffers.hugging.normalBuffer.buffer,
		buffers.hugging.uvBuffer.buffer,
		buffers.hugging.textureIdBuffer.buffer,
		buffers.terrainMask.positionBuffer.buffer,
		buffers.labels.position.buffer,
		buffers.labels.priority.buffer
	];

	for (const instance of Object.values(buffers.instances)) {
		transferables.push(instance.interleavedBufferLOD0.buffer);
		transferables.push(instance.interleavedBufferLOD1.buffer);
	}

	return transferables;
}

export function getTreeTextureIdFromType(type: VectorNodeDescriptor['treeType']): number[] {
	const lookup: Record<VectorNodeDescriptor['treeType'], number[]> = {
		beech: [0],
		fir: [1],
		linden: [2, 3],
		oak: [4],
		broadleaved: [0, 2, 3, 4],
		needleleaved: [1]
	};

	return lookup[type] ?? lookup.broadleaved;
}

export function getTreeHeightRangeFromTextureId(textureId: number): [number, number] {
	const lookup: Record<number, [number, number]> = {
		0: [10, 12],
		1: [20, 25],
		2: [10, 12],
		3: [10, 12],
		4: [8, 12]
	};

	return lookup[textureId];
}

export function getTreeTextureScaling(textureId: number): number {
	const lookup: Record<number, number> = {
		0: 1.35,
		1: 1.06,
		2: 1.19,
		3: 1.02,
		4: 1.43
	};

	return lookup[textureId];
}