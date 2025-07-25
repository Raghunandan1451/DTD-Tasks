import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore, EnhancedStore } from "@reduxjs/toolkit";
import { describe, it, expect, beforeEach, vi } from "vitest";
import QRCodeSettings from "@src/features/qr_generator/QRCodeSettings";
import "@testing-library/jest-dom";

// ---- Mock svgUtils ----
vi.mock("@src/lib/utils/svgUtils", () => ({
	getIconList: () => [
		{ src: "icon1", name: "Icon One" },
		{ src: "icon2", name: "Icon Two" },
	],
}));

// ---- Mock state and reducer ----
interface QRState {
	selectedIcon: string;
	bgColor: string;
	fgColor: string;
}

const initialState: QRState = {
	selectedIcon: "icon1",
	bgColor: "#ffffff",
	fgColor: "#000000",
};

interface UpdateSettingsAction {
	type: "qrSettings/updateSettings";
	payload: Partial<QRState>;
}

const qrReducer = (
	state: QRState = initialState,
	action: UpdateSettingsAction | { type: string; payload?: undefined }
): QRState => {
	switch (action.type) {
		case "qrSettings/updateSettings":
			return { ...state, ...action.payload };
		default:
			return state;
	}
};

// ---- Create store before each test ----
let store: EnhancedStore;

beforeEach(() => {
	store = configureStore({
		reducer: {
			qr: qrReducer,
		},
	});
});

// ---- Tests ----
describe("QRCodeSettings Component", () => {
	it("renders with correct initial values", () => {
		render(
			<Provider store={store}>
				<QRCodeSettings />
			</Provider>
		);

		const selectElement = screen.getByLabelText(
			/select icon/i
		) as HTMLSelectElement;
		expect(selectElement).toBeInTheDocument();
		expect(selectElement.value).toBe("icon1");

		const bgInput = screen.getByLabelText(
			/background color/i
		) as HTMLInputElement;
		expect(bgInput).toBeInTheDocument();
		expect(bgInput.value).toBe("#ffffff");

		const fgInput = screen.getByLabelText(
			/foreground color/i
		) as HTMLInputElement;
		expect(fgInput).toBeInTheDocument();
		expect(fgInput.value).toBe("#000000");
	});

	it("dispatches updateSettings when icon selection changes", () => {
		// const spy = vi.spyOn(store, "dispatch");
		const mockDispatch = vi.fn();
		store.dispatch = mockDispatch;

		render(
			<Provider store={store}>
				<QRCodeSettings />
			</Provider>
		);

		const selectElement = screen.getByLabelText(
			/select icon/i
		) as HTMLSelectElement;
		fireEvent.change(selectElement, { target: { value: "icon2" } });

		expect(mockDispatch).toHaveBeenCalledWith({
			type: "qrSettings/updateSettings",
			payload: { selectedIcon: "icon2" },
		});
	});

	it("dispatches updateSettings when background color changes", () => {
		const mockDispatch = vi.fn();
		store.dispatch = mockDispatch;

		render(
			<Provider store={store}>
				<QRCodeSettings />
			</Provider>
		);

		const bgInput = screen.getByLabelText(
			/background color/i
		) as HTMLInputElement;
		fireEvent.change(bgInput, { target: { value: "#111111" } });

		expect(mockDispatch).toHaveBeenCalledWith({
			type: "qrSettings/updateSettings",
			payload: { bgColor: "#111111" },
		});
	});

	it("dispatches updateSettings when foreground color changes", () => {
		const mockDispatch = vi.fn();
		store.dispatch = mockDispatch;

		render(
			<Provider store={store}>
				<QRCodeSettings />
			</Provider>
		);

		const fgInput = screen.getByLabelText(
			/foreground color/i
		) as HTMLInputElement;
		fireEvent.change(fgInput, { target: { value: "#222222" } });

		expect(mockDispatch).toHaveBeenCalledWith({
			type: "qrSettings/updateSettings",
			payload: { fgColor: "#222222" },
		});
	});
});
