import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import fileManagerReducer from "@src/lib/store/slices/markdownSlice"; // example paths
import qrReducer from "@src/lib/store/slices/qrSettingSlice";
import MarkdownEditor from "@src/features/markdown/FileManager";
import { vi, describe, it, beforeEach, expect } from "vitest";
import "@testing-library/jest-dom";

const mockShowNotification = vi.fn();

vi.mock("@src/lib/hooks/useNotifications", () => ({
	default: () => ({
		notifications: [],
		showNotification: mockShowNotification,
	}),
}));

const { readMarkdownTreeMock } = vi.hoisted(() => ({
	readMarkdownTreeMock: vi.fn(
		async (): Promise<Array<{ type: "file"; path: string; content: string }>> =>
			[],
	),
}));

vi.mock("@src/lib/utils/fileStorage/outputDirectory", () => ({
	hasOutputDirectory: vi.fn(async () => true),
}));

vi.mock("@src/lib/utils/fileStorage/outputFiles", () => ({
	readMarkdownTree: readMarkdownTreeMock,
	queueOutputWrite: vi.fn(),
	deleteOutputFile: vi.fn(),
	writeOutputFile: vi.fn(),
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
	default: ({ onRefresh }: { onRefresh: () => void }) => (
		<button onClick={onRefresh}>Refresh Markdown files</button>
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
				{ type: "file" as const, path: "README.md", content: "# Hello" },
				{ type: "file" as const, path: "index.md", content: "Welcome" },
			],
			selectedFile: null,
			content: "",
			loaded: true,
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
		render(
			<Provider store={store}>
				<MarkdownEditor />
			</Provider>,
		);

		expect(screen.getByText("Refresh Markdown files")).toBeInTheDocument();
		expect(screen.getByText("File Tree")).toBeInTheDocument();
		expect(screen.getByText("Editor")).toBeInTheDocument();
		expect(screen.getByText("Notification Center")).toBeInTheDocument();
	});

	it("re-reads Markdown files when Refresh is clicked", async () => {
		readMarkdownTreeMock
			.mockReset()
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([
				{ type: "file" as const, path: "latest.md", content: "Latest content" },
			]);
		render(
			<Provider store={store}>
				<MarkdownEditor />
			</Provider>,
		);

		await waitFor(() => {
			expect(readMarkdownTreeMock).toHaveBeenCalledTimes(1);
		});
		fireEvent.click(screen.getByText("Refresh Markdown files"));
		await waitFor(() => {
			expect(readMarkdownTreeMock).toHaveBeenCalledTimes(2);
			expect(store.getState().fileManager.files).toEqual([
				{ type: "file", path: "latest.md", content: "Latest content" },
			]);
		});
	});
});
