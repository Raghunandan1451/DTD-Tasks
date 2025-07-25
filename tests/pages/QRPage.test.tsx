import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, Mock, beforeEach } from "vitest";
import QRGenerator from "@src/pages/QRGenerator";
import { useDispatch, useSelector } from "react-redux";
import * as downloadHandler from "@src/lib/utils/downloadHandler";
import { updateSettings } from "@src/lib/store/slices/qrSettingSlice";
// import { RootState } from '@src/lib/store/store';

// 🧪 Mocks
const showNotificationMock = vi.fn();

vi.mock("react-redux", async () => {
	const actual = await vi.importActual<typeof import("react-redux")>(
		"react-redux"
	);
	return {
		...actual,
		useSelector: vi.fn(),
		useDispatch: vi.fn(),
	};
});

vi.mock("@src/lib/hooks/useNotifications", async () => {
	const actual = await vi.importActual<
		typeof import("@src/lib/hooks/useNotifications")
	>("@src/lib/hooks/useNotifications");
	return {
		...actual,
		default: vi.fn(() => ({
			notifications: [],
			showNotification: showNotificationMock,
		})),
	};
});

vi.mock("@src/components/shared/title_with_button/TitleWithButton", () => ({
	default: ({ onDownload }: { onDownload: () => void }) => (
		<button onClick={onDownload}>Download Image</button>
	),
}));

vi.mock("@src/features/qr_generator/QRCodeSettings", () => ({
	default: () => <div>Settings Panel</div>,
}));

vi.mock("@src/components/ui/toast/NotificationCenter", () => ({
	default: () => <div>Notifications</div>,
}));

vi.mock("@src/lib/utils/downloadHandler", () => ({
	handleDownloadImage: vi.fn(),
}));

// Mocks for QRCodeCanvas (optional - prevents canvas rendering issues)
vi.mock("qrcode.react", () => ({
	QRCodeCanvas: vi.fn(() => <canvas data-testid="qr-canvas" />),
}));

describe("QRGenerator", () => {
	const mockDispatch = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		// ✅ Return a mock state with valid shape
		(useSelector as unknown as Mock).mockImplementation((selector: any) =>
			selector({
				qr: {
					qrData: "https://example.com",
					bgColor: "#ffffff",
					fgColor: "#000000",
					selectedIcon: "",
				},
			})
		);

		(useDispatch as unknown as Mock).mockReturnValue(mockDispatch);
	});

	it("renders input, button, settings panel and notifications", () => {
		render(<QRGenerator />);
		expect(
			screen.getByPlaceholderText("Enter URL or Text")
		).toBeInTheDocument();
		expect(screen.getByText("Generate")).toBeInTheDocument();
		expect(screen.getByText("Download Image")).toBeInTheDocument();
		expect(screen.getByText("Settings Panel")).toBeInTheDocument();
		expect(screen.getByText("Notifications")).toBeInTheDocument();
	});

	it("updates input and generates QR data on click", () => {
		render(<QRGenerator />);

		const input = screen.getByPlaceholderText(
			"Enter URL or Text"
		) as HTMLInputElement;
		fireEvent.change(input, { target: { value: "https://newsite.com" } });

		expect(input.value).toBe("https://newsite.com");

		const generateBtn = screen.getByText("Generate");
		fireEvent.click(generateBtn);

		expect(mockDispatch).toHaveBeenCalledWith(
			updateSettings({ qrData: "https://newsite.com" })
		);
	});

	it("shows notification when trying to generate with empty input", () => {
		render(<QRGenerator />);

		const generateBtn = screen.getByText("Generate");
		fireEvent.click(generateBtn);

		expect(showNotificationMock).toHaveBeenCalledWith(
			"Please enter a valid input",
			"error"
		);
	});

	it('calls download handler on "Download Image"', () => {
		render(<QRGenerator />);
		fireEvent.click(screen.getByText("Download Image"));
		expect(downloadHandler.handleDownloadImage).toHaveBeenCalled();
	});
});
