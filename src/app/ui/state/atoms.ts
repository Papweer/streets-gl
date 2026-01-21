import { atomWithBidirectionalSync, StateStorage, SyncedAtom, createAtomFamily } from "~/app/ui/state/utils";
import { SettingsObjectEntry } from "~/app/settings/SettingsObject";
import { SettingsSchema } from "~/app/settings/SettingsSchema";
import RenderGraphSnapshot from "~/app/ui/RenderGraphSnapshot";

export interface AtomsCollection {
	activeFeature: SyncedAtom<{type: number; id: number} | null>;
	fps: SyncedAtom<number>;
	frameTime: SyncedAtom<number>;
	mapTime: SyncedAtom<number>;
	mapTimeMultiplier: SyncedAtom<number>;
	mapTimeMode: SyncedAtom<number>;
	resourcesLoadingProgress: SyncedAtom<number>;
	resourceInProgressPath: SyncedAtom<string>;
	renderGraph: SyncedAtom<RenderGraphSnapshot | null>;
	northDirection: SyncedAtom<number>;
	settingsObject: (param: string) => SyncedAtom<SettingsObjectEntry>;
	settingsSchema: SyncedAtom<SettingsSchema>;
	dataTimestamp: SyncedAtom<Date | null>;
}

export const getAtoms = (
	commonStorage: StateStorage,
	settingsStorage: StateStorage
): AtomsCollection => {
	return {
		activeFeature: atomWithBidirectionalSync('activeFeature', commonStorage),
		fps: atomWithBidirectionalSync('fpsSmooth', commonStorage),
		frameTime: atomWithBidirectionalSync('frameTimeSmooth', commonStorage),
		mapTime: atomWithBidirectionalSync('mapTime', commonStorage),
		mapTimeMultiplier: atomWithBidirectionalSync('mapTimeMultiplier', commonStorage),
		mapTimeMode: atomWithBidirectionalSync('mapTimeMode', commonStorage),
		resourcesLoadingProgress: atomWithBidirectionalSync('resourcesLoadingProgress', commonStorage),
		resourceInProgressPath: atomWithBidirectionalSync('resourceInProgressPath', commonStorage),
		renderGraph: atomWithBidirectionalSync('renderGraph', commonStorage),
		northDirection: atomWithBidirectionalSync('northDirection', commonStorage),
		settingsObject: createAtomFamily<SettingsObjectEntry>(settingsStorage),
		settingsSchema: atomWithBidirectionalSync('settingsSchema', commonStorage),
		dataTimestamp: atomWithBidirectionalSync('dataTimestamp', commonStorage),
	};
};