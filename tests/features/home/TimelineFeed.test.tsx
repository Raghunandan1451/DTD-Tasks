import "fake-indexeddb/auto";
import "@testing-library/jest-dom";
import { IDBFactory } from "fake-indexeddb";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import {
	configure,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Timeline from "@src/features/home/components/timeline/Timeline";
import store from "@src/lib/store/store";
import { setExpenses } from "@src/lib/store/slices/expensesSlice";
import { setFileState } from "@src/lib/store/slices/markdownSlice";
import { getDB, resetDBForTests } from "@src/lib/db/database";
import { logMarkdown } from "@src/lib/db/markdownLogRepo";
import { formatISODate } from "@src/lib/utils/isoDate";
import type { ExpenseEntry } from "@src/features/finance/type";
import type { File as MdFile, Folder } from "@src/features/markdown/type";

// The first render hydrates slices and opens IndexedDB; on a busy CI box or a
// full parallel run that can exceed the default 1s.
configure({ asyncUtilTimeout: 5000 });

const daysAgo = (n: number): Date => {
	const date = new Date();
	date.setDate(date.getDate() - n);
	date.setHours(12, 0, 0, 0);
	return date;
};
const isoAgo = (n: number) => formatISODate(daysAgo(n));

const addNote = async (id: string, text: string, createdAt: number) =>
	(await getDB()).put("journal", { id, text, createdAt });

const expense = (id: string, n: number, name: string, amount: number): ExpenseEntry => ({
	id,
	date: isoAgo(n),
	group: "Food",
	name,
	amount,
	type: "Dr",
});

const file = (id: string, path: string): MdFile => ({
	id,
	path,
	type: "file",
	content: "",
});

const seed = (expenses: ExpenseEntry[] = [], files: (MdFile | Folder)[] = []) => {
	store.dispatch(setExpenses(expenses));
	store.dispatch(
		setFileState({ files, selectedFile: null, content: "", loaded: true }),
	);
};

const renderFeed = () => {
	const showNotification = vi.fn();
	render(
		<Provider store={store}>
			<MemoryRouter>
				<Timeline showNotification={showNotification} />
			</MemoryRouter>
		</Provider>,
	);
	return { showNotification, user: userEvent.setup() };
};

beforeEach(async () => {
	await resetDBForTests();
	globalThis.indexedDB = new IDBFactory();
	seed();
});

describe("feed filters", () => {
	it("shows one kind at a time and everything under All", async () => {
		seed([expense("e1", 0, "Lunch", 100)], [file("f1", "a.md")]);
		await addNote("n1", "hello journal", daysAgo(0).getTime());
		await logMarkdown("f1", "a.md", "created");
		const { user } = renderFeed();

		await screen.findByText("hello journal");
		expect(screen.getByText("Lunch · Spent ₹100")).toBeInTheDocument();
		expect(screen.getByText("Created a.md")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Journal" }));
		await waitFor(() => expect(screen.queryByText("Lunch · Spent ₹100")).toBeNull());
		expect(screen.getByText("hello journal")).toBeInTheDocument();
		expect(screen.queryByText("Created a.md")).toBeNull();

		await user.click(screen.getByRole("button", { name: "Expenses" }));
		await screen.findByText("Lunch · Spent ₹100");
		expect(screen.queryByText("hello journal")).toBeNull();
		expect(screen.queryByText("Created a.md")).toBeNull();

		await user.click(screen.getByRole("button", { name: "Files" }));
		await screen.findByText("Created a.md");
		expect(screen.queryByText("Lunch · Spent ₹100")).toBeNull();

		await user.click(screen.getByRole("button", { name: "All" }));
		await screen.findByText("hello journal");
		expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	it("explains an empty filter instead of the first-note prompt", async () => {
		const { user } = renderFeed();
		await screen.findByText("Write your first note");
		await user.click(screen.getByRole("button", { name: "Expenses" }));
		expect(await screen.findByText("No expenses yet")).toBeInTheDocument();
	});
});

describe("load more", () => {
	it("reaches the next older day each time and hides the button when history ends", async () => {
		await addNote("recent", "recent note", daysAgo(5).getTime());
		await addNote("mid", "mid note", daysAgo(40).getTime());
		await addNote("old", "old note", daysAgo(100).getTime());
		const { user } = renderFeed();

		await screen.findByText("recent note");
		expect(screen.queryByText("mid note")).toBeNull();

		await user.click(screen.getByRole("button", { name: "Load more" }));
		await screen.findByText("mid note");
		expect(screen.queryByText("old note")).toBeNull();

		await user.click(screen.getByRole("button", { name: "Load more" }));
		await screen.findByText("old note");
		await waitFor(() =>
			expect(screen.queryByRole("button", { name: /Load more|Loading/ })).toBeNull(),
		);
	});

	it("does not offer more when everything already fits", async () => {
		await addNote("n", "only note", daysAgo(1).getTime());
		renderFeed();
		await screen.findByText("only note");
		expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
	});
});

describe("On this day", () => {
	it("shows notes from earlier years on today's date and hides when there are none", async () => {
		const lastYear = daysAgo(0);
		lastYear.setFullYear(lastYear.getFullYear() - 1);
		await addNote("memory", "a year ago today", lastYear.getTime());
		renderFeed();

		const card = await screen.findByRole("region", { name: "On this day" });
		expect(within(card).getByText("a year ago today")).toBeInTheDocument();
		expect(within(card).getByText(/1 year ago/)).toBeInTheDocument();
	});

	it("is absent without earlier notes", async () => {
		await addNote("n", "today only", daysAgo(0).getTime());
		renderFeed();
		await screen.findByText("today only");
		expect(screen.queryByRole("region", { name: "On this day" })).toBeNull();
	});

	it("is hidden under the Expenses and Files filters", async () => {
		const lastYear = daysAgo(0);
		lastYear.setFullYear(lastYear.getFullYear() - 1);
		await addNote("memory", "a year ago today", lastYear.getTime());
		const { user } = renderFeed();
		await screen.findByRole("region", { name: "On this day" });
		await user.click(screen.getByRole("button", { name: "Expenses" }));
		expect(screen.queryByRole("region", { name: "On this day" })).toBeNull();
	});
});

describe("editing and deleting notes", () => {
	it("edits text, mood and tags but keeps the original date", async () => {
		const createdAt = daysAgo(0).getTime();
		await addNote("n1", "first draft", createdAt);
		const { user, showNotification } = renderFeed();
		await screen.findByText("first draft");

		await user.click(screen.getByRole("button", { name: "Edit note" }));
		const form = screen.getByRole("form", { name: "Edit note" });
		const box = within(form).getByRole("textbox", { name: "Note text" });
		await user.clear(box);
		await user.type(box, "second draft");
		await user.click(within(form).getByRole("button", { name: "Good mood" }));
		await user.type(within(form).getByRole("textbox", { name: "Add a tag" }), "edited,{Enter}");
		await user.click(within(form).getByRole("button", { name: "Save" }));

		// The edit form closes only once the save has finished.
		await waitFor(() =>
			expect(screen.queryByRole("form", { name: "Edit note" })).toBeNull(),
		);
		expect(screen.getByText("second draft")).toBeInTheDocument();
		expect(screen.queryByText("first draft")).toBeNull();
		expect(screen.getByText("#edited")).toBeInTheDocument();
		const stored = await (await getDB()).get("journal", "n1");
		expect(stored).toMatchObject({
			text: "second draft",
			mood: 4,
			tags: ["edited"],
			createdAt,
		});
		expect(stored?.updatedAt).toBeDefined();
		expect(showNotification).toHaveBeenCalledWith("Note updated", "success");
	});

	it("cancels an edit without changing anything", async () => {
		await addNote("n1", "keep this", daysAgo(0).getTime());
		const { user } = renderFeed();
		await screen.findByText("keep this");
		await user.click(screen.getByRole("button", { name: "Edit note" }));
		const form = screen.getByRole("form", { name: "Edit note" });
		await user.type(within(form).getByRole("textbox", { name: "Note text" }), " extra");
		await user.click(within(form).getByRole("button", { name: "Cancel" }));

		expect(screen.getByText("keep this")).toBeInTheDocument();
		expect((await (await getDB()).get("journal", "n1"))?.text).toBe("keep this");
	});

	it("asks before deleting, and deletes only after confirming", async () => {
		await addNote("n1", "doomed", daysAgo(0).getTime());
		const { user, showNotification } = renderFeed();
		await screen.findByText("doomed");

		await user.click(screen.getByRole("button", { name: "Delete note" }));
		await user.click(await screen.findByRole("button", { name: "Cancel" }));
		expect(screen.getByText("doomed")).toBeInTheDocument();
		expect(await (await getDB()).get("journal", "n1")).toBeTruthy();

		await user.click(screen.getByRole("button", { name: "Delete note" }));
		await user.click(await screen.findByRole("button", { name: "Delete" }));
		await waitFor(() => expect(screen.queryByText("doomed")).toBeNull());
		expect(await (await getDB()).get("journal", "n1")).toBeUndefined();
		expect(showNotification).toHaveBeenCalledWith("Note deleted", "success");
	});
});

describe("row links", () => {
	it("opens a live file in Markdown and leaves deleted files as plain text", async () => {
		seed([], [file("f1", "a.md")]);
		await logMarkdown("f1", "a.md", "created");
		await logMarkdown("gone", "Old.md", "deleted");
		const { user } = renderFeed();

		const link = await screen.findByRole("link", { name: /Created a\.md/ });
		expect(link).toHaveAttribute("href", "/notes");
		expect(screen.getByText("Deleted Old.md")).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /Deleted Old\.md/ })).toBeNull();

		await user.click(link);
		expect(store.getState().fileManager.selectedFile).toBe("a.md");
	});

	it("follows a renamed file to its current path", async () => {
		seed(
			[],
			[
				{
					id: "d1",
					path: "Notes",
					type: "folder",
					children: [file("f1", "Plan.md")],
				},
			],
		);
		await logMarkdown("f1", "Notes/Idea.md", "edited");
		const { user } = renderFeed();

		await user.click(await screen.findByRole("link", { name: /Edited Notes\/Idea\.md/ }));
		expect(store.getState().fileManager.selectedFile).toBe("Notes/Plan.md");
	});

	it("sends an expense row to the Expenses page on that day", async () => {
		seed([expense("e1", 2, "Taxi", 250)]);
		const { user } = renderFeed();

		const link = await screen.findByRole("link", { name: /Taxi · Spent ₹250/ });
		expect(link).toHaveAttribute("href", "/expenses");
		await user.click(link);
		expect(store.getState().expenses.selectedDate).toBe(isoAgo(2));
	});

	it("keeps collapsed expense groups unrendered until opened", async () => {
		seed([expense("e1", 0, "Tea", 10), expense("e2", 0, "Bun", 20)]);
		const { user } = renderFeed();

		const toggle = await screen.findByRole("button", { name: /2 expenses/ });
		expect(screen.queryByText("Tea")).toBeNull();
		await user.click(toggle);
		expect(await screen.findByText("Tea")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Open this day in Expenses" })).toHaveAttribute(
			"href",
			"/expenses",
		);
	});
});

describe("large data", () => {
	it("renders only the loaded window when there are 10k expenses", async () => {
		const many = Array.from({ length: 10_000 }, (_, index) =>
			expense(`e${index}`, index % 400, `Item ${index}`, (index % 90) + 1),
		);
		seed(many);

		renderFeed();
		await screen.findAllByRole("button", { name: /\d+ expenses/ }, { timeout: 5000 });

		// 30 days -> at most 30 day sections, each with one collapsed expense row,
		// and none of the thousands of individual items in the DOM.
		expect(document.querySelectorAll(".tl-day").length).toBeLessThanOrEqual(30);
		expect(screen.queryByText("Item 5")).toBeNull();
		expect(document.querySelectorAll("li").length).toBeLessThan(200);
		expect(screen.getByRole("button", { name: "Load more" })).toBeInTheDocument();
	}, 30000);
});
