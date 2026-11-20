import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutosave } from "@src/features/nodes/lib/useAutosave";
import {
	createMemoryBoardsStore,
	createMemoryNotesStore,
} from "@src/lib/storage/memoryStorage";
import { resetStorage, setStorage } from "@src/lib/storage";
import type { BoardContent, BoardsStore } from "@src/lib/storage";

const content = (label: string): BoardContent => ({
	nodes: [
		{ id: "n1", type: "note", position: { x: 0, y: 0 }, data: { title: label, color: "slate" } },
	],
	edges: [],
	viewport: { x: 0, y: 0, zoom: 1 },
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("useAutosave through the storage seam", () => {
	let memory: BoardsStore;
	let slowFirstSave: boolean;

	beforeEach(() => {
		slowFirstSave = false;
		memory = createMemoryBoardsStore();
		setStorage({
			notes: createMemoryNotesStore(),
			boards: {
				...memory,
				// The first write is slow, so a second one is ready while it is still running.
				saveBoardContent: async (...args) => {
					if (slowFirstSave) {
						slowFirstSave = false;
						await wait(60);
					}
					return memory.saveBoardContent(...args);
				},
			},
		});
	});

	afterEach(() => {
		resetStorage();
		vi.useRealTimers();
	});

	it("never lets an older save land after a newer one", async () => {
		const board = await memory.createBoard("Race");
		let current = content("first");
		const { result } = renderHook(() =>
			useAutosave({ boardId: board.id, getContent: () => current }),
		);

		slowFirstSave = true;
		await act(async () => {
			result.current.markDirty("content");
			const first = result.current.flush();
			current = content("second");
			result.current.markDirty("content");
			const second = result.current.flush();
			await Promise.all([first, second]);
		});

		const stored = await memory.getBoard(board.id);
		expect(stored?.nodes[0].data).toMatchObject({ title: "second" });
		expect(result.current.status).toBe("saved");
	});

	it("saves after the pause, and keeps the change to retry when a save fails", async () => {
		const board = await memory.createBoard("Retry");
		let fail = true;
		const onError = vi.fn();
		const base = memory.saveBoardContent;
		setStorage({
			notes: createMemoryNotesStore(),
			boards: {
				...memory,
				saveBoardContent: async (...args) => {
					if (fail) throw new Error("disk full");
					return base(...args);
				},
			},
		});
		const { result } = renderHook(() =>
			useAutosave({ boardId: board.id, getContent: () => content("kept"), onError }),
		);

		await act(async () => {
			result.current.markDirty("content");
			await wait(900); // past the 800ms pause
		});
		expect(onError).toHaveBeenCalledWith("disk full");
		expect(result.current.status).toBe("error");
		expect((await memory.getBoard(board.id))?.nodes).toEqual([]);

		fail = false;
		await act(async () => {
			result.current.markDirty("content");
			await result.current.flush();
		});
		expect((await memory.getBoard(board.id))?.nodes[0].data).toMatchObject({ title: "kept" });
		expect(result.current.status).toBe("saved");
	});
});
