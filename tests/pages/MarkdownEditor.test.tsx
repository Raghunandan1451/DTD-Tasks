import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import fileManagerReducer from "@src/lib/store/slices/markdownSlice"; // example paths
import qrReducer from "@src/lib/store/slices/qrSettingSlice";
import MarkdownEditor from "@src/pages/MarkdownEditor";
import * as downloadHandler from "@src/lib/utils/downloadHandler";
import { vi, describe, it, beforeEach, expect } from "vitest";
import "@testing-library/jest-dom";

const mockShowNotification = vi.fn();

vi.mock("@src/lib/hooks/useNotifications", () => ({
	default: () => ({
		notifications: [],
		showNotification: mockShowNotification,
	}),
}));

vi.mock("@src/lib/utils/downloadHandler", () => ({
	handleZIPExport: vi.fn(),
}));

vi.mock("@src/components/ui/toast/NotificationCenter", () => ({
	default: () => <div>Notification Center</div>,
}));

vi.mock("@src/features/markdown/FileTree", () => ({
	default: () => <div>File Tree</div>,
}));

vi.mock("@src/features/markdown/Editor", () => ({
	default: () => <div>Editor</div>,
}));

vi.mock("@src/components/shared/title_with_button/TitleWithButton", () => ({
	default: ({ onDownload }: { onDownload: () => void }) => (
		<button onClick={onDownload}>Export as ZIP</button>
	),
}));

const store = configureStore({
	reducer: {
		fileManager: fileManagerReducer,
		qr: qrReducer,
	},
	preloadedState: {
		fileManager: {
			files: [
				{ type: "file", path: "README.md", content: "# Hello" },
				{ type: "file", path: "index.md", content: "Welcome" },
			],
			selectedFile: null,
			content: "",
			loaded: false,
		},
		qr: {
			qrData: "",
			selectedIcon: "",
			bgColor: "#ffffff",
			fgColor: "#000000",
		},
	},
});

describe("MarkdownEditor", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders all parts of the UI", () => {
		// const store = createMockStore();
		render(
			<Provider store={store}>
				<MarkdownEditor />
			</Provider>
		);

		expect(screen.getByText("Export as ZIP")).toBeInTheDocument();
		expect(screen.getByText("File Tree")).toBeInTheDocument();
		expect(screen.getByText("Editor")).toBeInTheDocument();
		expect(screen.getByText("Notification Center")).toBeInTheDocument();
	});

	// it("calls handleZIPExport on download button click", () => {
	// 	// const store = createMockStore();
	// 	render(
	// 		<Provider store={store}>
	// 			<MarkdownEditor />
	// 		</Provider>
	// 	);

	// 	fireEvent.click(screen.getByText("Export as ZIP"));
	// 	expect(downloadHandler.handleZIPExport).toHaveBeenCalledWith(
	// 		[
	// 			{ name: "README.md", content: "# Hello" },
	// 			{ name: "index.md", content: "Welcome" },
	// 		],
	// 		mockShowNotification
	// 	);
	// });
});
