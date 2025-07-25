import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import reducer, { updateSettings } from "@src/lib/store/slices/qrSettingSlice";
import { getFromIndexedDB } from "@src/lib/utils/persistMiddleware";

vi.mock("@src/lib/utils/persistMiddleware", () => ({
	getFromIndexedDB: vi.fn(),
}));

const defaultState = {
	qrData: "",
	selectedIcon: "",
	bgColor: "#ffffff",
	fgColor: "#000000",
};

describe("qrSettingSlice", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(getFromIndexedDB as Mock).mockReturnValue(null);
	});

	it("should update QR settings partially", () => {
		const update = { qrData: "https://google.com", fgColor: "#ff0000" };
		const state = reducer(defaultState, updateSettings(update));
		expect(state).toEqual({
			...defaultState,
			...update,
		});
	});
});
