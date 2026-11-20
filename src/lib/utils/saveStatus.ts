import { useSyncExternalStore } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface SaveStatus {
	state: SaveState;
	/** Why the last save failed, when state is "error". */
	message: string | null;
}

let status: SaveStatus = { state: "idle", message: null };
const listeners = new Set<() => void>();

const set = (next: SaveStatus) => {
	status = next;
	listeners.forEach((listener) => listener());
};

export const markSaving = (): void => set({ state: "saving", message: null });
export const markSaved = (): void => set({ state: "saved", message: null });
export const markSaveFailed = (error: unknown): void =>
	set({
		state: "error",
		message: error instanceof Error && error.message ? error.message : "The data could not be saved.",
	});

export const getSaveStatus = (): SaveStatus => status;

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => listeners.delete(listener);
};

/** The latest save status of the notes, for a small "Saved / Saving… / Error" label. */
export const useSaveStatus = (): SaveStatus => useSyncExternalStore(subscribe, getSaveStatus, getSaveStatus);
