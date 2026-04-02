import { VectorPolylineDescriptor } from "~/lib/tile-processing/vector/qualifiers/descriptors";
import Tile3DProjectedGeometry, {
    getZIndex,
} from "~/lib/tile-processing/tile3d/features/Tile3DProjectedGeometry";
import { ProjectedTextures } from "~/lib/tile-processing/tile3d/textures";

// const lookup: Record<VectorPolylineDescriptor["pathMaterial"], {
//     textureId: number;
//     zIndex: number;
//     uvFollowRoad: boolean;
//     uvScaleY: number;
//     uvMaxX: number;
// }> = {
//     "wood": {
//         textureId: ProjectedTextures.WoodRoad,

//     }
// };

export default function getPathParams(
		pathType: VectorPolylineDescriptor['pathType'],
		pathMaterial: VectorPolylineDescriptor['pathMaterial'],
		width: number,
		mercatorScale: number
	): {
		textureId: number;
		widthScale: number;
		uvScale: number;
		uvScaleY: number;
		uvMinX: number;
		uvMaxX: number;
		uvFollowRoad: boolean;
		zIndex: number;
		needsUsageMask: boolean;
	}[] {
		const params = [{
			textureId: 0,
			widthScale: 1,
			uvScale: 1,
			uvScaleY: 1,
			uvMinX: 0,
			uvMaxX: 1,
			zIndex: 0,
			uvFollowRoad: false,
			needsUsageMask: false
		}];

		switch (pathType) {
			case 'footway': {
				switch (pathMaterial) {
					case 'wood': {
						params[0].textureId = ProjectedTextures.WoodRoad;
						params[0].zIndex = getZIndex("Road", "Wood");
						params[0].uvFollowRoad = true;
						params[0].uvScaleY = 4;
						params[0].uvMaxX = width / 4;
						break;
					}
					case 'cobblestone': {
						params[0].textureId = ProjectedTextures.Cobblestone;
						params[0].zIndex = getZIndex("Road", "Cobblestone")
						params[0].uvMinX = 0;
						params[0].uvMaxX = width * mercatorScale / 6;
						params[0].uvScaleY = 6;
						params[0].uvScale = 8;
						params[0].needsUsageMask = true;
						break;
					}
					case 'asphalt': {
						params[0].textureId = ProjectedTextures.Asphalt;
						params[0].zIndex = getZIndex("Road", "Asphalt");
						params[0].uvScale = 20;
						break;
					}
					default: {
						params[0].textureId = ProjectedTextures.Asphalt;
						params[0].zIndex = getZIndex("Road", "Asphalt");
						params[0].uvScale = 20;
					}
				}
				break;
			}
			case 'roadway': {
				params[0].uvFollowRoad = true;
				switch (pathMaterial) {
					case 'asphalt': {
						params[0].textureId = ProjectedTextures.Asphalt;
						params[0].zIndex = getZIndex("Road", "Asphalt");
						params[0].uvScaleY = 12;
						params[0].needsUsageMask = true;
						break;
					}
					case 'concrete': {
						params[0].textureId = ProjectedTextures.ConcreteRoad;
						params[0].zIndex = getZIndex("Road", "Concrete");
						params[0].uvScaleY = 12;
						params[0].needsUsageMask = true;
						break;
					}
					case 'wood': {
						params[0].textureId = ProjectedTextures.WoodRoad;
						params[0].zIndex = getZIndex("Road", "Wood");
						params[0].uvScaleY = 4;
						params[0].uvMinX = 0;
						params[0].uvMaxX = width * mercatorScale / 4;
						params[0].needsUsageMask = true;
						break;
					}
					case 'cobblestone': {
						params[0].textureId = ProjectedTextures.Cobblestone;
						params[0].zIndex = getZIndex("Road", "Cobblestone");
						params[0].uvMinX = 0;
						params[0].uvMaxX = width * mercatorScale / 6;
						params[0].uvScaleY = 6;
						params[0].uvScale = 10;
						params[0].needsUsageMask = true;
						break;
					}
					case 'dirt': {
						params[0].uvFollowRoad = true;
						params[0].textureId = ProjectedTextures.DirtRoad;
						params[0].zIndex = getZIndex("Road", "Dirt");
						params[0].widthScale = 1.7;
						params[0].uvMinX = 0;
						params[0].uvMaxX = 1;
						params[0].uvScaleY = width * mercatorScale;
						break;
					}
					case 'sand': {
						params[0].uvFollowRoad = true;
						params[0].textureId = ProjectedTextures.SandRoad;
						params[0].zIndex = getZIndex("Road", "Sand");
						params[0].widthScale = 1.7;
						params[0].uvMinX = 0;
						params[0].uvMaxX = 1;
						params[0].uvScaleY = width * mercatorScale;
						break;
					}
				}
				break;
			}
			case 'cycleway': {
				params[0].textureId = ProjectedTextures.Cycleway;
				params[0].zIndex = getZIndex("Road", "Cycleway");
				params[0].uvFollowRoad = false;
				params[0].uvScale = 8;
				break;
			}
			case 'tramway': {
				params[0].textureId = ProjectedTextures.Rail;
				params[0].zIndex = getZIndex("Railway", "Rail");
				params[0].widthScale = 2;
				params[0].uvFollowRoad = true;
				params[0].uvMinX = 0;
				params[0].uvMaxX = 1;
				params[0].uvScaleY = width * mercatorScale * 4;
				break;
			}
			case 'railway': {
				params[0].textureId = ProjectedTextures.Railway;
				params[0].zIndex = getZIndex("Railway", "Railway");
				params[0].widthScale = 2;
				params[0].uvFollowRoad = true;
				params[0].uvMinX = 0;
				params[0].uvMaxX = 1;
				params[0].uvScaleY = width * mercatorScale * 4;

				params.push({
					textureId: ProjectedTextures.RailwayTop,
					zIndex: getZIndex("Railway", "RailwayOverlay"),
					widthScale: 2,
					uvFollowRoad: true,
					uvMinX: 0,
					uvMaxX: 1,
					uvScaleY: width * mercatorScale * 4,
					uvScale: 1,
					needsUsageMask: false
				});
				params.push({
					textureId: ProjectedTextures.Rail,
					zIndex: getZIndex("Railway", "Rail"),
					widthScale: 2,
					uvFollowRoad: true,
					uvMinX: 0,
					uvMaxX: 1,
					uvScaleY: width * mercatorScale * 4,
					uvScale: 1,
					needsUsageMask: false
				});
				break;
			}
			case 'runway': {
				params[0].uvFollowRoad = false;
				params[0].textureId = ProjectedTextures.Asphalt;
				params[0].zIndex = getZIndex("Road", "Asphalt");
				params[0].uvScale = 10;
				break;
			}
		}

		return params;
	}
