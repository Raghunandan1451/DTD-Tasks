import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NAV_COLLAPSED_KEY, useNavCollapsed } from "@src/lib/hooks/useNavCollapsed";

describe("useNavCollapsed", () => {
	beforeEach(() => localStorage.clear());
	afterEach(() => vi.restoreAllMocks());

	it("starts expanded, toggles, and remembers the choice", () => {
		const { result, unmount } = renderHook(() => useNavCollapsed());
		expect(result.current.collapsed).toBe(false);

		act(() => result.current.toggle());
		expect(result.current.collapsed).toBe(true);
		expect(localStorage.getItem(NAV_COLLAPSED_KEY)).toBe("1");

		unmount();
		expect(renderHook(() => useNavCollapsed()).result.current.collapsed).toBe(true);
	});

	it("still works when storage is blocked", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("blocked");
		});

		const { result } = renderHook(() => useNavCollapsed());
		expect(result.current.collapsed).toBe(false);
		act(() => result.current.toggle());
		expect(result.current.collapsed).toBe(true);
	});
});
