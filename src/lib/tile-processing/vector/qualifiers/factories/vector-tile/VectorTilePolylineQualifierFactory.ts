import AbstractQualifierFactory from "~/lib/tile-processing/vector/qualifiers/factories/AbstractQualifierFactory";
import {VectorPolylineDescriptor} from "~/lib/tile-processing/vector/qualifiers/descriptors";
import {Qualifier, QualifierType} from "~/lib/tile-processing/vector/qualifiers/Qualifier";
import {VectorTile} from "~/lib/tile-processing/vector/providers/pbf/VectorTile";
import {ModifierType} from "~/lib/tile-processing/vector/qualifiers/modifiers";
import getTreeType from "~/lib/tile-processing/vector/qualifiers/factories/vector-tile/helpers/getTreeType";
import getWaterwayParams from "~/lib/tile-processing/vector/qualifiers/factories/vector-tile/helpers/getWaterwayParams";
import getWallParams from "~/lib/tile-processing/vector/qualifiers/factories/vector-tile/helpers/getWallParams";
import getFenceParams from "~/lib/tile-processing/vector/qualifiers/factories/vector-tile/helpers/getFenceParams";
import getRailwayParams from "~/lib/tile-processing/vector/qualifiers/factories/vector-tile/helpers/getRailwayParams";
import getFeatureHeightAndMinHeight
	from "~/lib/tile-processing/vector/qualifiers/factories/vector-tile/helpers/getHeightAndMinHeight";

export default class VectorTilePolylineQualifierFactory extends AbstractQualifierFactory<VectorPolylineDescriptor, VectorTile.FeatureTags> {
	public fromTags(tags: VectorTile.FeatureTags): Qualifier<VectorPolylineDescriptor>[] {
		if (tags.type === 'path') {
			switch (<string>tags.pathCategory) {
				case 'aeroway': {
					const width = <number>tags.width;

					return [{
						type: QualifierType.Descriptor,
						data: {
							type: 'path',
							pathType: 'runway',
							width: width
						}
					}];
				}
				case "roadway": {
					const qualifiers: Qualifier<VectorPolylineDescriptor>[] = [];
					qualifiers.push({
						type: QualifierType.Descriptor,
						data: {
							type: 'path',
							pathType: 'roadway',
							pathMaterial: <string>tags.material,
							lanesForward: <number>tags.lanesForward,
							lanesBackward: <number>tags.lanesBackward,
							width: <number>tags.width,
							isRoadwayMarked: <boolean>tags.markings
						}
					});

					const sidewalkSide = <string>tags.sidewalkSide;
					const cyclewaySide = <string>tags.cyclewaySide;
					const cyclewayWidth = 2; // TODO: Move to planetiler
					const sidewalkWidth = 2;

					if (cyclewaySide) {
						qualifiers.push({
							type: QualifierType.Descriptor,
							data: { // TODO: Make cycleway material non-hardcoded
								type: 'path',
								pathType: 'cycleway',
								width: <number>tags.width + cyclewayWidth * 2,
								side: cyclewaySide
							}
						});
					}

					if (sidewalkSide) {
						if (!cyclewaySide || cyclewaySide === 'both') {
							qualifiers.push({
								type: QualifierType.Descriptor,
								data: {
									type: 'path',
									pathType: 'footway',
									width: <number>tags.width + sidewalkWidth * 2 + (cyclewaySide === 'both' ? cyclewayWidth * 2 : 0),
									side: sidewalkSide
								}
							});
						} else {
							if (sidewalkSide === 'left' || sidewalkSide === 'both') {
								const multiplier = cyclewaySide === 'left' ? 1 : 0;
								const width = <number>tags.width + sidewalkWidth * 2 + multiplier * cyclewayWidth * 2;

								qualifiers.push({
									type: QualifierType.Descriptor,
									data: {
										type: 'path',
										pathType: 'footway',
										width: width,
										side: 'left'
									}
								});
							}

							if (sidewalkSide === 'right' || sidewalkSide === 'both') {
								const multiplier = cyclewaySide === 'right' ? 1 : 0;
								const width = <number>tags.width + sidewalkWidth * 2 + multiplier * cyclewayWidth * 2;

								qualifiers.push({
									type: QualifierType.Descriptor,
									data: {
										type: 'path',
										pathType: 'footway',
										width: width,
										side: 'right'
									}
								});
							}
						}
					}

					return qualifiers;
				}
				case 'footway': {
					return [{
						type: QualifierType.Descriptor,
						data: {
							type: 'path',
							pathType: 'footway',
							width: <number>tags.width
						}
					}];
				}
				case 'cycleway': {
					return [{
						type: QualifierType.Descriptor,
						data: {
							type: 'path',
							pathType: 'cycleway',
							width: <number>tags.width
						}
					}];
				}
			}
		}

		if (tags.type === 'railway') {
			const {type, width} = getRailwayParams(tags);

			return [{
				type: QualifierType.Descriptor,
				data: {
					type: 'path',
					pathType: type,
					width: width
				}
			}];
		}

		if (tags.type === 'treeRow') {
			const [height, minHeight] = getFeatureHeightAndMinHeight(tags);

			return [{
				type: QualifierType.Modifier,
				data: {
					type: ModifierType.NodeRow,
					spacing: 10,
					randomness: 1,
					descriptor: {
						type: 'tree',
						height: height,
						minHeight: minHeight,
						treeType: getTreeType(tags)
					}
				}
			}];
		}

		if (tags.type === 'waterway') {
			const params = getWaterwayParams(tags);

			if (!params) {
				return null;
			}

			return [{
				type: QualifierType.Descriptor,
				data: {
					type: 'waterway',
					width: params.width,
				}
			}];
		}

		if (tags.type === 'wall') {
			const params = getWallParams(tags);

			return [{
				type: QualifierType.Descriptor,
				data: {
					type: 'wall',
					wallType: params.material,
					height: params.height,
					minHeight: params.minHeight
				}
			}];
		}

		if (tags.type === 'fence') {
			const params = getFenceParams(tags);

			return [{
				type: QualifierType.Descriptor,
				data: {
					type: 'fence',
					fenceMaterial: params.material,
					height: params.height,
					minHeight: params.minHeight
				}
			}];
		}

		if (tags.type === 'parkingSpace') {
			return [{
				type: QualifierType.Descriptor,
				data: {
					type: 'parkingSpace' // TODO: only add if marked=yes
				}
			}];
		}
		/*if (tags.type === 'powerLine') {
			return [{
				type: QualifierType.Descriptor,
				data: {
					type: 'powerLine'
				}
			}];
		}*/

		return null;
	}
}
