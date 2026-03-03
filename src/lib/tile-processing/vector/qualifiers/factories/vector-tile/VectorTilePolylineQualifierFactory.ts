import AbstractQualifierFactory from "~/lib/tile-processing/vector/qualifiers/factories/AbstractQualifierFactory";
import {VectorPolylineDescriptor} from "~/lib/tile-processing/vector/qualifiers/descriptors";
import {Qualifier, QualifierType} from "~/lib/tile-processing/vector/qualifiers/Qualifier";
import {VectorTile} from "~/lib/tile-processing/vector/providers/pbf/VectorTile";
import {ModifierType} from "~/lib/tile-processing/vector/qualifiers/modifiers";

export default class VectorTilePolylineQualifierFactory extends AbstractQualifierFactory<VectorPolylineDescriptor, VectorTile.FeatureTags> {
	public fromTags(tags: VectorTile.FeatureTags): Qualifier<VectorPolylineDescriptor>[] {
		if (tags.type === 'path') {
			switch (<string>tags.pathCategory) {
				case 'aeroway': {
					return [{
						type: QualifierType.Descriptor,
						data: {
							type: 'path',
							pathType: 'runway',
							width: <number>tags.width,
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
			return [{
				type: QualifierType.Descriptor,
				data: {
					type: 'path',
					pathType: <string>tags.pathType,
					width: <number>tags.width
				}
			}];
		}

		if (tags.type === 'treeRow') {
			return [{
				type: QualifierType.Modifier,
				data: {
					type: ModifierType.NodeRow,
					spacing: 10,
					randomness: 1,
					descriptor: {
						type: 'tree',
						height: <number>tags.height,
						minHeight: <number>tags.minHeight,
						treeType: <string>tags.treeType
					}
				}
			}];
		}

		if (tags.type === 'waterway') {
			return [{
				type: QualifierType.Descriptor,
				data: {
					type: 'waterway',
					width: <number>tags.width,
				}
			}];
		}
		
		if (tags.type === 'barrier') {
			return [{
				type: QualifierType.Descriptor,
				data: {
					type: <string>tags.barrierType,
					material: <string>tags.material,
					height: <number>tags.height,
					minHeight: <number>tags.minHeight
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
