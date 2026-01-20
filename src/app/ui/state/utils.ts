import { atom, WritableAtom } from "jotai";

export interface StateStorage {
	getStateFieldValue(key: string): any;
	setStateFieldValue(key: string, value: any): void;
	addStateFieldListener(key: string, listener: (value: any) => void): void;
	removeStateFieldListener(key: string, listener: (value: any) => void): void;
}

export type SyncedAtom<T> = WritableAtom<T, [T], void>;

export const atomWithBidirectionalSync = <T>(key: string, storage: StateStorage): SyncedAtom<T> => {
	const initialValue = storage.getStateFieldValue(key) as T;
	const valueAtom = atom<T>(initialValue);
	
	// Track the last value to prevent update loops when storage notifies synchronously
	let lastValue: T = initialValue;
	
	const syncedAtom = atom(
		(get) => get(valueAtom),
		(get, set, newValue: T) => {
			lastValue = newValue;
			set(valueAtom, newValue);
			storage.setStateFieldValue(key, newValue);
		}
	);
	
	syncedAtom.onMount = (setAtom): (() => void) => {
		const listener = (newValue: T): void => {
			// Only update if value actually changed to prevent loops
			if (newValue !== lastValue) {
				lastValue = newValue;
				setAtom(newValue);
			}
		};
		
		storage.addStateFieldListener(key, listener);
		
		return (): void => {
			storage.removeStateFieldListener(key, listener);
		};
	};
	
	return syncedAtom;
};

export const createAtomFamily = <T>(storage: StateStorage): ((key: string) => SyncedAtom<T>) => {
	const atomCache = new Map<string, SyncedAtom<T>>();
	
	return (key: string): SyncedAtom<T> => {
		if (!atomCache.has(key)) {
			atomCache.set(key, atomWithBidirectionalSync<T>(key, storage));
		}
		return atomCache.get(key)!;
	};
};