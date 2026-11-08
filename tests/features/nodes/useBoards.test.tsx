import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDBForTests } from "@src/lib/db/database";
import { useBoards } from "@src/features/nodes/lib/useBoards";

beforeEach(async () => {
	await resetDBForTests();
	globalThis.indexedDB = new IDBFactory();
});

describe("useBoards", () => {
	it("does not create a default board when there are none", async () => {
		const { result } = renderHook(() => useBoards());
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.boards).toEqual([]);
		expect(result.current.active).toBeNull();
	});

	it("a new grid board starts with one node in one column", async () => {
		const { result } = renderHook(() => useBoards());
		await waitFor(() => expect(result.current.loading).toBe(false));

		await act(async () => {
			await result.current.create(undefined, "grid");
		});
		expect(result.current.active?.layoutMode).toBe("grid");
		expect(result.current.active?.nodes).toHaveLength(1);
		expect(result.current.active?.gridColumns).toBe(1);

		await act(async () => {
			await result.current.create(undefined, "tree");
		});
		expect(result.current.active?.nodes).toHaveLength(0);
	});

	it("deleting the last board leaves nothing open instead of making a new one", async () => {
		const { result } = renderHook(() => useBoards());
		await waitFor(() => expect(result.current.loading).toBe(false));
		await act(async () => {
			await result.current.create();
		});
		const id = result.current.activeId as string;

		await act(async () => {
			await result.current.remove(id);
		});
		expect(result.current.boards).toEqual([]);
		expect(result.current.active).toBeNull();
	});
});
