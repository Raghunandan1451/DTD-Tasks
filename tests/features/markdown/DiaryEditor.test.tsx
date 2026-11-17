import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
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

const markers = (text: string) => (text.match(/<!-- page:/g) ?? []).length;

const mockWide = (wide: boolean) => {
	window.matchMedia = ((q: string) => ({
		matches: wide,
		media: q,
		addEventListener: () => {},
		removeEventListener: () => {},
	})) as unknown as typeof window.matchMedia;
};

beforeEach(() => localStorage.clear());

afterEach(() => {
	vi.restoreAllMocks();
	// @ts-expect-error cleanup for other tests
	delete window.matchMedia;
	localStorage.clear();
});

describe("DiaryEditor scroll view", () => {
	it("opens nothing when no file is selected", () => {
		setup(null);
		expect(screen.getByText(/select a file/i)).toBeInTheDocument();
	});

	it("shows every entry in one scrolling list, read-only, each with its date", () => {
		setup();
		expect(screen.queryByLabelText("Page text")).toBeNull();
		expect(screen.getByText("first page")).toBeInTheDocument();
		expect(screen.getByText("second page")).toBeInTheDocument();
		const dates = screen.getAllByTestId("page-date");
		expect(dates[0]).toHaveTextContent("Sunday, 1 November 2026");
		expect(dates[1]).toHaveTextContent("3 November 2026");
		const counters = screen.getAllByTestId("page-counter");
		expect(counters[0]).toHaveTextContent("Page 1 of 2");
		expect(counters[1]).toHaveTextContent("Page 2 of 2");
		// No page-turn buttons here: you scroll.
		expect(screen.queryByLabelText("Next page")).toBeNull();
	});

	it("opens an empty note in edit mode, ready to type", () => {
		setup("a.md", "");
		expect(screen.getByLabelText("Page text")).toBeInTheDocument();
		expect(screen.getByLabelText("Page text")).toHaveFocus();
	});

	it("opens an empty note in the scroll view even if the book was last used", () => {
		localStorage.setItem("diary:view", "book");
		setup("a.md", "");
		expect(screen.getByLabelText("Page text")).toBeInTheDocument();
		expect(screen.getByLabelText("Scroll view")).toHaveAttribute("aria-pressed", "true");
	});

	it("opens a note with text in preview, not edit", () => {
		setup("a.md", "some text");
		expect(screen.queryByLabelText("Page text")).toBeNull();
	});

	it("edits only the entry being typed in and leaves the dates alone", () => {
		const store = setup();
		fireEvent.click(screen.getByLabelText("Edit mode"));
		fireEvent.change(screen.getAllByLabelText("Page text")[0], {
			target: { value: "changed" },
		});
		expect(store.getState().fileManager.content).toBe(
			"<!-- page: 2026-11-01 -->\nchanged\n<!-- page: 2026-11-03 -->\nsecond page",
		);
	});

	it("never creates pages by itself, however much is typed", () => {
		const store = setup();
		fireEvent.click(screen.getByLabelText("Edit mode"));
		fireEvent.change(screen.getAllByLabelText("Page text")[0], {
			target: { value: "word ".repeat(5000) },
		});
		expect(markers(store.getState().fileManager.content)).toBe(2);
		expect(screen.getAllByTestId("page-date")).toHaveLength(2);
	});

	it("keeps a page-sized screen from cutting text, even when the layout says it overflows", () => {
		// The old code asked the layout "does this fit?" and split text onto new pages.
		vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
			function (this: HTMLElement) {
				return (this.textContent ?? "").length;
			},
		);
		vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(10);

		const store = setup();
		fireEvent.click(screen.getByLabelText("Edit mode"));
		fireEvent.change(screen.getAllByLabelText("Page text")[0], {
			target: { value: "aaaa bbbb cccc dddd" },
		});
		expect(store.getState().fileManager.content).toBe(
			"<!-- page: 2026-11-01 -->\naaaa bbbb cccc dddd\n<!-- page: 2026-11-03 -->\nsecond page",
		);
	});

	it("adds a page dated today and puts the cursor in it", () => {
		const store = setup();
		fireEvent.click(screen.getByLabelText("Edit mode"));
		fireEvent.click(screen.getByLabelText("Add page"));
		expect(screen.getAllByTestId("page-counter")[2]).toHaveTextContent("Page 3 of 3");
		expect(store.getState().fileManager.content).toMatch(
			/\n<!-- page: \d{4}-\d{2}-\d{2} -->\n$/,
		);
		const fields = screen.getAllByLabelText("Page text");
		expect(fields).toHaveLength(3);
		expect(fields[2]).toHaveFocus();
	});

	it("labels pages with no recorded date", () => {
		setup("a.md", "legacy text");
		expect(screen.getByTestId("page-date")).toHaveTextContent("Undated");
	});
});

describe("DiaryEditor view choice", () => {
	it("starts in the scroll view and remembers a switch to the book", () => {
		setup();
		expect(screen.getByLabelText("Scroll view")).toHaveAttribute("aria-pressed", "true");

		fireEvent.click(screen.getByLabelText("Book view"));
		expect(screen.getByLabelText("Book view")).toHaveAttribute("aria-pressed", "true");
		expect(localStorage.getItem("diary:view")).toBe("book");
	});

	it("opens in the book next time when that was the last choice", () => {
		localStorage.setItem("diary:view", "book");
		setup();
		expect(screen.getByLabelText("Book view")).toHaveAttribute("aria-pressed", "true");
		expect(screen.getAllByTestId("book-entry")).toHaveLength(2);
	});

	it("falls back to the scroll view when the saved choice is nonsense", () => {
		localStorage.setItem("diary:view", "carousel");
		setup();
		expect(screen.getByLabelText("Scroll view")).toHaveAttribute("aria-pressed", "true");
	});

	it("is read-only in the book: no edit switch, no add page, no merge", () => {
		setup();
		fireEvent.click(screen.getByLabelText("Edit mode"));
		expect(screen.getByLabelText("Add page")).toBeInTheDocument();

		fireEvent.click(screen.getByLabelText("Book view"));
		expect(screen.queryByLabelText("Edit mode")).toBeNull();
		expect(screen.queryByLabelText("Add page")).toBeNull();
		expect(screen.queryByLabelText("Page text")).toBeNull();
		expect(screen.getByText("first page")).toBeInTheDocument();
	});

	it("comes back to the scroll view in preview, not in edit", () => {
		setup();
		fireEvent.click(screen.getByLabelText("Edit mode"));
		fireEvent.click(screen.getByLabelText("Book view"));
		fireEvent.click(screen.getByLabelText("Scroll view"));
		expect(screen.queryByLabelText("Page text")).toBeNull();
		expect(screen.getByLabelText("Edit mode")).toBeInTheDocument();
	});

	it("shows the one/two page choice only in the book", () => {
		setup();
		expect(screen.queryByLabelText("Show two pages")).toBeNull();
		fireEvent.click(screen.getByLabelText("Book view"));
		expect(screen.getByLabelText("Show two pages")).toBeInTheDocument();
		expect(screen.getByLabelText("Show one page")).toHaveAttribute("aria-pressed", "true");
	});
});

describe("DiaryEditor book view", () => {
	// jsdom has no layout, so give the reading area a size and say how wide the
	// text columns came out (what a browser would work out for itself).
	const layout = (columnsScrollWidth: number) => {
		vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(524);
		vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(400);
		vi.spyOn(Element.prototype, "scrollWidth", "get").mockImplementation(function (
			this: Element,
		) {
			return this.getAttribute("data-testid") === "book-columns" ? columnsScrollWidth : 0;
		});
	};

	const openBook = () => {
		const store = setup();
		fireEvent.click(screen.getByLabelText("Book view"));
		return store;
	};

	it("counts the pages the browser made and turns them with the buttons", () => {
		// 3 pages of 500px with 32px gaps.
		layout(500 * 3 + 32 * 2);
		openBook();
		expect(screen.getByTestId("page-counter")).toHaveTextContent("Page 1 of 3");
		expect(screen.getByLabelText("Previous page")).toBeDisabled();

		fireEvent.click(screen.getByLabelText("Next page"));
		expect(screen.getByTestId("page-counter")).toHaveTextContent("Page 2 of 3");
		expect(screen.getByTestId("book-columns")).toHaveStyle({
			transform: "translateX(-532px)",
		});

		fireEvent.click(screen.getByLabelText("Next page"));
		expect(screen.getByLabelText("Next page")).toBeDisabled();
		fireEvent.click(screen.getByLabelText("Previous page"));
		expect(screen.getByTestId("page-counter")).toHaveTextContent("Page 2 of 3");
	});

	it("turns pages with the arrow keys", () => {
		layout(500 * 3 + 32 * 2);
		openBook();
		fireEvent.keyDown(window, { key: "ArrowRight" });
		expect(screen.getByTestId("page-counter")).toHaveTextContent("Page 2 of 3");
		fireEvent.keyDown(window, { key: "ArrowLeft" });
		expect(screen.getByTestId("page-counter")).toHaveTextContent("Page 1 of 3");
	});

	it("shows two pages at once on a wide screen and remembers the choice", () => {
		mockWide(true);
		// 5 pages of 234px with 32px gaps.
		layout(234 * 5 + 32 * 4);
		openBook();
		fireEvent.click(screen.getByLabelText("Show two pages"));
		expect(localStorage.getItem("diary:pagesPerView")).toBe("2");

		expect(screen.getByTestId("page-counter")).toHaveTextContent("Pages 1–2 of 5");
		fireEvent.click(screen.getByLabelText("Next page"));
		expect(screen.getByTestId("page-counter")).toHaveTextContent("Pages 3–4 of 5");
		fireEvent.click(screen.getByLabelText("Next page"));
		expect(screen.getByTestId("page-counter")).toHaveTextContent("Page 5 of 5");
		expect(screen.getByLabelText("Next page")).toBeDisabled();

		// Back to one page: a single page number, not a range.
		fireEvent.click(screen.getByLabelText("Show one page"));
		expect(screen.getByTestId("page-counter")).toHaveTextContent(/^Page \d+ of \d+$/);
	});

	it("stays on the same page when the number of pages shown changes", () => {
		mockWide(true);
		layout(500 * 5 + 32 * 4);
		openBook();
		fireEvent.click(screen.getByLabelText("Next page"));
		fireEvent.click(screen.getByLabelText("Next page"));
		expect(screen.getByTestId("page-counter")).toHaveTextContent("Page 3 of 5");

		// Two columns of 234px: the same text now needs more pages.
		fireEvent.click(screen.getByLabelText("Show two pages"));
		expect(screen.getByTestId("page-counter")).toHaveTextContent(/^Pages 3–4 of /);
	});

	it("never shows two pages on a narrow screen", () => {
		mockWide(false);
		localStorage.setItem("diary:pagesPerView", "2");
		localStorage.setItem("diary:view", "book");
		layout(500 * 2 + 32);
		setup();
		expect(screen.getByTestId("page-counter")).toHaveTextContent("Page 1 of 2");
	});

	it("starts every entry on a new page and shows its date, without saving anything", () => {
		const store = openBook();
		const entries = screen.getAllByTestId("book-entry");
		expect(entries[0].getAttribute("style") ?? "").not.toMatch(/break-before/);
		expect(entries[1].getAttribute("style") ?? "").toMatch(/break-before:\s*column/);
		expect(within(entries[0]).getByText("Sunday, 1 November 2026")).toBeInTheDocument();
		expect(store.getState().fileManager.content).toBe(CONTENT);
	});
});

describe("DiaryEditor merging same-day pages", () => {
	const SPLIT =
		"<!-- page: 2026-11-01 -->\nI went to the\n<!-- page: 2026-11-01 -->\nshop today.\n<!-- page: 2026-11-03 -->\nlater";

	it("offers a merge only when neighbouring pages share a date, and only while editing", () => {
		setup("a.md", CONTENT);
		fireEvent.click(screen.getByLabelText("Edit mode"));
		expect(screen.queryByLabelText("Merge same-day pages")).toBeNull();
	});

	it("shows how many pages would disappear", () => {
		setup("a.md", SPLIT);
		expect(screen.queryByLabelText("Merge same-day pages")).toBeNull();
		fireEvent.click(screen.getByLabelText("Edit mode"));
		expect(screen.getByLabelText("Merge same-day pages")).toHaveTextContent("(1)");
	});

	it("asks first, then joins the pages and leaves other days alone", async () => {
		const store = setup("a.md", SPLIT);
		fireEvent.click(screen.getByLabelText("Edit mode"));
		fireEvent.click(screen.getByLabelText("Merge same-day pages"));

		expect(screen.getByText(/3 pages become 2/)).toBeInTheDocument();
		expect(store.getState().fileManager.content).toBe(SPLIT);

		fireEvent.click(screen.getByRole("button", { name: "Merge" }));
		await waitFor(() =>
			expect(store.getState().fileManager.content).toBe(
				"<!-- page: 2026-11-01 -->\nI went to the shop today.\n<!-- page: 2026-11-03 -->\nlater",
			),
		);
		expect(screen.queryByLabelText("Merge same-day pages")).toBeNull();
	});

	it("changes nothing when the question is cancelled", async () => {
		const store = setup("a.md", SPLIT);
		fireEvent.click(screen.getByLabelText("Edit mode"));
		fireEvent.click(screen.getByLabelText("Merge same-day pages"));
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

		await waitFor(() => expect(screen.queryByText(/3 pages become 2/)).toBeNull());
		expect(store.getState().fileManager.content).toBe(SPLIT);
	});
});

describe("DiaryEditor page deletion", () => {
	const openDeleteDialog = () => {
		const store = setup();
		fireEvent.click(screen.getByLabelText("Edit mode"));
		fireEvent.click(screen.getAllByLabelText("Delete page")[0]);
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
		expect(screen.getAllByTestId("page-counter")[0]).toHaveTextContent("Page 1 of 2");
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
