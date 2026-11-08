import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom";
import fileManagerReducer from "@src/lib/store/slices/markdownSlice";
import DiaryEditor from "@src/features/markdown/DiaryEditor";

const CONTENT =
	"<!-- page: 2026-11-01 -->\nfirst page\n<!-- page: 2026-11-03 -->\nsecond page";

const setup = (selected: string | null = "a.md", content = CONTENT) => {
	const store = configureStore({
		reducer: { fileManager: fileManagerReducer },
		preloadedState: {
			fileManager: {
				files: [{ id: "1", type: "file" as const, path: "a.md", content }],
				selectedFile: selected,
				content: selected ? content : "",
				loaded: true,
			},
		},
	});
	render(
		<Provider store={store}>
			<DiaryEditor />
		</Provider>,
	);
	return store;
};

describe("DiaryEditor", () => {
	it("opens nothing when no file is selected", () => {
		setup(null);
		expect(screen.getByText(/select a file/i)).toBeInTheDocument();
	});

	it("starts in read-only preview on page 1 with its date", () => {
		setup();
		expect(screen.queryByLabelText("Page text")).toBeNull();
		expect(screen.getByText("first page")).toBeInTheDocument();
		expect(screen.getByTestId("page-date")).toHaveTextContent("Sunday, 1 November 2026");
		expect(screen.getByTestId("page-counter")).toHaveTextContent("Page 1 of 2");
	});

	it("turns pages with the side buttons", () => {
		setup();
		expect(screen.getByLabelText("Previous page")).toBeDisabled();
		fireEvent.click(screen.getByLabelText("Next page"));
		expect(screen.getByText("second page")).toBeInTheDocument();
		expect(screen.getByTestId("page-date")).toHaveTextContent("3 November 2026");
		expect(screen.getByLabelText("Next page")).toBeDisabled();
	});

	it("edits only the current page and leaves the date alone", () => {
		const store = setup();
		fireEvent.click(screen.getByLabelText("Edit mode"));
		fireEvent.change(screen.getByLabelText("Page text"), {
			target: { value: "changed" },
		});
		expect(store.getState().fileManager.content).toBe(
			"<!-- page: 2026-11-01 -->\nchanged\n<!-- page: 2026-11-03 -->\nsecond page",
		);
	});

	it("adds a page dated today", () => {
		const store = setup();
		fireEvent.click(screen.getByLabelText("Edit mode"));
		fireEvent.click(screen.getByLabelText("Add page"));
		expect(screen.getByTestId("page-counter")).toHaveTextContent("Page 3 of 3");
		expect(store.getState().fileManager.content).toMatch(
			/\n<!-- page: \d{4}-\d{2}-\d{2} -->\n$/,
		);
	});

	it("shows arrows in the date row", () => {
		setup();
		const row = screen.getByTestId("page-date").parentElement!;
		expect(row).toContainElement(screen.getByLabelText("Previous page"));
		expect(row).toContainElement(screen.getByLabelText("Next page"));
	});

	it("labels pages with no recorded date", () => {
		setup("a.md", "legacy text");
		expect(screen.getByTestId("page-date")).toHaveTextContent("Undated");
	});
});

describe("DiaryEditor layout", () => {
	afterEach(() => vi.restoreAllMocks());

	it("shows two pages at once on wide screens", () => {
		window.matchMedia = ((q: string) => ({
			matches: true,
			media: q,
			addEventListener: () => {},
			removeEventListener: () => {},
		})) as unknown as typeof window.matchMedia;
		setup();
		fireEvent.click(screen.getByLabelText("Show two pages"));
		expect(screen.getByText("first page")).toBeInTheDocument();
		expect(screen.getByText("second page")).toBeInTheDocument();
		expect(screen.getAllByTestId("page-date")).toHaveLength(2);
		// Both arrows sit on the outer edges and are at their limits.
		expect(screen.getByLabelText("Previous page")).toBeDisabled();
		expect(screen.getByLabelText("Next page")).toBeDisabled();
		fireEvent.click(screen.getByLabelText("Show one page"));
		expect(screen.queryByText("second page")).toBeNull();
		// @ts-expect-error cleanup for other tests
		delete window.matchMedia;
		localStorage.clear();
	});

	it("flows overflowing text onto a new page instead of scrolling", () => {
		// Fake layout: a page holds 10 characters.
		vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
			function (this: HTMLElement) {
				return (this.textContent ?? "").length;
			},
		);
		vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(10);

		const store = setup();
		fireEvent.click(screen.getByLabelText("Edit mode"));
		fireEvent.change(screen.getByLabelText("Page text"), {
			target: { value: "aaaa bbbb cccc dddd" },
		});

		expect(screen.getByTestId("page-counter")).toHaveTextContent("Page 2 of 3");
		expect(screen.getByLabelText("Page text")).toHaveValue("cccc dddd");
		const saved = store.getState().fileManager.content;
		expect(saved).toContain("<!-- page: 2026-11-01 -->\naaaa bbbb\n");
		expect(saved).toMatch(/<!-- page: \d{4}-\d{2}-\d{2} -->\ncccc dddd\n/);
		expect(saved.endsWith("second page")).toBe(true);
	});
});

describe("DiaryEditor page deletion", () => {
	afterEach(() => vi.restoreAllMocks());

	const openDeleteDialog = () => {
		const store = setup();
		fireEvent.click(screen.getByLabelText("Edit mode"));
		fireEvent.click(screen.getByLabelText("Delete page"));
		return store;
	};

	it("asks with the app's own dialog, not the browser's", () => {
		const nativeConfirm = vi.spyOn(window, "confirm");
		openDeleteDialog();

		expect(nativeConfirm).not.toHaveBeenCalled();
		expect(screen.getByText("Delete page")).toBeInTheDocument();
		expect(screen.getByText(/Delete page 1 of 2/)).toBeInTheDocument();
		expect(screen.getByText("Item: Sunday, 1 November 2026")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
	});

	it("keeps the page when the dialog is cancelled", async () => {
		const store = openDeleteDialog();
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

		await waitFor(() => expect(screen.queryByText(/Delete page 1 of 2/)).toBeNull());
		expect(store.getState().fileManager.content).toBe(CONTENT);
		expect(screen.getByTestId("page-counter")).toHaveTextContent("Page 1 of 2");
	});

	it("keeps the page when the dialog is dismissed with Escape", async () => {
		const store = openDeleteDialog();
		fireEvent.keyDown(document, { key: "Escape" });

		await waitFor(() => expect(screen.queryByText(/Delete page 1 of 2/)).toBeNull());
		expect(store.getState().fileManager.content).toBe(CONTENT);
	});

	it("removes the page once confirmed", async () => {
		const store = openDeleteDialog();
		fireEvent.click(screen.getByRole("button", { name: "Delete" }));

		await waitFor(() =>
			expect(store.getState().fileManager.content).toBe(
				"<!-- page: 2026-11-03 -->\nsecond page",
			),
		);
		expect(screen.getByTestId("page-counter")).toHaveTextContent("Page 1 of 1");
	});
});
