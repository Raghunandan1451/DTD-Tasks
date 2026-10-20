import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Home from "@src/features/home/Home";

vi.mock("@src/components/ui/toast/NotificationCenter", () => ({
	default: () => null,
}));

vi.mock("@src/lib/hooks/useNotifications", () => ({
	default: () => ({ notifications: [], showNotification: vi.fn() }),
}));

vi.mock("qrcode.react", () => ({
	QRCodeCanvas: () => <canvas />,
}));

vi.mock("react-redux", () => ({
	useSelector: (selector: (state: object) => unknown) =>
		selector({
			calendar: { events: [], loaded: true },
			expenses: { expenses: [], loaded: true },
			finance: { loaded: true },
			fileManager: { files: [], loaded: true },
			qr: {
				qrData: "https://example.com",
				selectedIcon: "",
				bgColor: "#ffffff",
				fgColor: "#000000",
			},
		}),
}));

vi.mock("@src/lib/utils/fileStorage/outputDirectory", () => ({
	chooseOutputDirectory: vi.fn(),
	getSelectedOutputDirectoryName: vi.fn(async () => null),
	supportsOutputDirectoryPicker: () =>
		typeof window !== "undefined" && "showDirectoryPicker" in window,
}));

vi.mock("@src/lib/utils/fileStorage/outputTransfer", () => ({
	downloadOutputArchive: vi.fn(async () => true),
}));

describe("Home file storage controls", () => {
	let originalPicker: PropertyDescriptor | undefined;

	beforeEach(() => {
		originalPicker = Object.getOwnPropertyDescriptor(
			window,
			"showDirectoryPicker",
		);
		Reflect.deleteProperty(window, "showDirectoryPicker");
	});

	afterEach(() => {
		if (originalPicker) {
			Object.defineProperty(
				window,
				"showDirectoryPicker",
				originalPicker,
			);
		} else {
			Reflect.deleteProperty(window, "showDirectoryPicker");
		}
	});

	it("shows the legacy section-download UI and Upload without the picker API", () => {
		const { container } = render(<Home />);

		expect(
			screen.getByRole("button", { name: "Download All" }),
		).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Upload" })).toBeNull();
		expect(screen.getByRole("button", { name: /Events/ })).toBeTruthy();
		expect(
			screen.queryByRole("button", { name: /QR Code/ }),
		).toBeNull();
		expect(container.querySelector('input[type="file"]')).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Select folder" }),
		).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: /Events/ }));
		expect(
			screen.getByRole("button", { name: "Download (3)" }),
		).toBeTruthy();
	});

	it("keeps folder selection when the picker API exists", () => {
		Object.defineProperty(window, "showDirectoryPicker", {
			configurable: true,
			value: vi.fn(),
		});
		render(<Home />);

		expect(
			screen.getByRole("button", { name: "Select folder" }),
		).toBeTruthy();
		expect(
			screen.queryByRole("button", { name: "Download All" }),
		).toBeNull();
		expect(screen.queryByRole("button", { name: "Upload" })).toBeNull();
	});
});
