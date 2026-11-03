import React from "react";
import "fake-indexeddb/auto";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import expensesReducer from "@src/lib/store/slices/expensesSlice";
import markdownReducer from "@src/lib/store/slices/markdownSlice";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Timeline from "@src/features/home/components/timeline/Timeline";
import { buildTimelineRows } from "@src/features/home/lib/timelineLayout";
import type { TimelineStatus } from "@src/features/home/lib/useTimeline";
import type { TimelineDay } from "@src/features/home/lib/timelineTypes";

const state = vi.hoisted(() => ({
	status: "ready" as "loading" | "ready" | "error",
	days: [] as unknown[],
	refresh: vi.fn(),
}));

vi.mock("@src/features/home/lib/useTimeline", async () => {
	const layout = await import("@src/features/home/lib/timelineLayout");
	return {
		useTimeline: () => ({
			status: state.status,
			rows: layout.buildTimelineRows(state.days as TimelineDay[], "2026-11-02"),
			refresh: state.refresh,
			filter: "all",
			setFilter: vi.fn(),
			hasMore: false,
			loadingMore: false,
			loadMore: vi.fn(),
		}),
	};
});

const days: TimelineDay[] = [
	{
		day: "2026-11-02",
		expenseTotals: { count: 3, debit: 1000, credit: 79 },
		items: [
			{
				kind: "journal",
				id: "journal:j1",
				entry: { id: "j1", text: "A good day", mood: 5, tags: ["home"], createdAt: new Date(2026, 10, 2, 9, 5).getTime() },
			},
			...[1, 2, 3].map((n) => ({
				kind: "file" as const,
				id: `file:f${n}`,
				isLive: true,
				entry: { id: `f${n}`, fileId: `f${n}`, name: `Notes/n${n}.md`, action: "edited" as const, day: "2026-11-02", createdAt: 0, updatedAt: 0 },
			})),
			{ kind: "expense", id: "expense:e1", entry: { id: "e1", date: "2026-11-02", group: "Food", name: "Lunch", amount: 600, type: "Dr" } },
			{ kind: "expense", id: "expense:e2", entry: { id: "e2", date: "2026-11-02", group: "Food", name: "Dinner", amount: 400, type: "Dr" } },
			{ kind: "expense", id: "expense:e3", entry: { id: "e3", date: "2026-11-02", group: "Salary", name: "Refund", amount: 79, type: "Cr" } },
		],
	},
	{
		day: "2026-10-20",
		expenseTotals: { count: 0, debit: 0, credit: 0 },
		items: [
			{ kind: "file", id: "file:gone", isLive: false, entry: { id: "gone", fileId: "gone", name: "Old/Idea.md", action: "deleted", day: "2026-10-20", createdAt: 0, updatedAt: 0 } },
		],
	},
];

const renderTimeline = () =>
	render(
		<Provider
			store={configureStore({
				reducer: { expenses: expensesReducer, fileManager: markdownReducer },
			})}
		>
			<MemoryRouter>
				<Timeline />
			</MemoryRouter>
		</Provider>,
	);

beforeEach(() => {
	state.status = "ready";
	state.days = days;
	state.refresh.mockClear();
});

describe("Timeline", () => {
	it("keeps the note composer hidden until toggled", () => {
		renderTimeline();
		expect(
			screen.queryByRole("form", { name: "Write a journal note" }),
		).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "New note" }));
		expect(
			screen.getByRole("form", { name: "Write a journal note" }),
		).toBeInTheDocument();
	});

	it("shows a skeleton while loading", () => {
		state.status = "loading" satisfies TimelineStatus;
		renderTimeline();
		expect(screen.getByTestId("timeline-skeleton")).toBeInTheDocument();
	});

	it("shows the empty state when there is no activity", () => {
		state.days = [];
		renderTimeline();
		expect(screen.getByText("Write your first note")).toBeInTheDocument();
	});

	it("offers a retry on error", () => {
		state.status = "error";
		renderTimeline();
		fireEvent.click(screen.getByRole("button", { name: "Try again" }));
		expect(state.refresh).toHaveBeenCalled();
	});

	it("renders day milestones with labels and counts", () => {
		renderTimeline();
		const headings = screen.getAllByRole("heading", { level: 2 });
		expect(headings[0]).toHaveTextContent("Today");
		expect(headings[0]).toHaveTextContent("7 activities");
		expect(headings[1]).toHaveTextContent("Tue, 20 Oct 2026");
		expect(headings[1]).toHaveTextContent("1 activity");
	});

	it("marks only today's node for the pulse", () => {
		const { container } = renderTimeline();
		expect(container.querySelectorAll(".tl-node--today")).toHaveLength(1);
	});

	it("renders a journal card with its mood and tags", () => {
		renderTimeline();
		expect(screen.getByText("A good day")).toBeInTheDocument();
		const card = within(screen.getByRole("article"));
		expect(card.getByRole("img", { name: "Great mood" })).toBeInTheDocument();
		expect(card.getByText("#home")).toBeInTheDocument();
	});

	it("collapses same-type automatic rows into expandable summaries", () => {
		renderTimeline();
		expect(
			screen.getByRole("button", { name: /3 expenses · Spent ₹1,000 · Received ₹79/ }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Edited 3 files/ })).toBeInTheDocument();
	});

	it("expands a group inline and keeps collapsed content out of reach", () => {
		renderTimeline();
		const toggle = screen.getByRole("button", { name: /Edited 3 files/ });
		const panel = document.getElementById(toggle.getAttribute("aria-controls") ?? "");

		expect(toggle).toHaveAttribute("aria-expanded", "false");
		expect(panel).toHaveAttribute("data-open", "false");
		expect(panel?.firstElementChild).toHaveAttribute("inert");

		fireEvent.click(toggle);

		expect(toggle).toHaveAttribute("aria-expanded", "true");
		expect(panel).toHaveAttribute("data-open", "true");
		expect(panel?.firstElementChild).not.toHaveAttribute("inert");
		expect(within(panel as HTMLElement).getByText("Notes/n2.md")).toBeInTheDocument();

		fireEvent.click(toggle);
		expect(toggle).toHaveAttribute("aria-expanded", "false");
	});

	it("shows deleted files as plain, non-interactive rows", () => {
		renderTimeline();
		expect(screen.getByText("Deleted Old/Idea.md")).toBeInTheDocument();
		expect(screen.queryByRole("link")).toBeNull();
		expect(screen.queryByRole("button", { name: /Deleted/ })).toBeNull();
	});

	it("draws a dotted gap between days far apart", () => {
		const { container } = renderTimeline();
		expect(container.querySelectorAll(".tl-gap")).toHaveLength(1);
		expect(screen.getByText("12 days with no activity")).toBeInTheDocument();
	});

	it("keeps the layout helper and the rendered rows in step", () => {
		const rows = buildTimelineRows(days, "2026-11-02");
		renderTimeline();
		expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(
			rows.filter((row) => row.type === "day").length,
		);
	});
});
