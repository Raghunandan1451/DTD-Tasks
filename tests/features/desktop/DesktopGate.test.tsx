import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import DesktopGate from "@src/features/desktop/DesktopGate";
import type { DesktopApi, FolderState } from "@src/lib/desktop/types";

const fakeDesktop = (initial: FolderState, next: Partial<Record<"choose" | "confirm" | "retry", FolderState>> = {}) => {
	let beforeClose: (() => Promise<void> | void) | null = null;
	const api = {
		folder: {
			getState: vi.fn(async () => initial),
			choose: vi.fn(async () => next.choose ?? initial),
			confirm: vi.fn(async () => next.confirm ?? initial),
			retry: vi.fn(async () => next.retry ?? initial),
			forget: vi.fn(async () => ({ status: "none" }) as FolderState),
		},
		fs: {} as DesktopApi["fs"],
		onBeforeClose: vi.fn((handler) => {
			beforeClose = handler;
			return () => {
				beforeClose = null;
			};
		}),
		shell: { openFolder: vi.fn(async () => {}), saveFile: vi.fn(async () => "") },
	} satisfies DesktopApi;
	window.desktop = api;
	return { api, runBeforeClose: () => beforeClose?.() };
};

afterEach(() => {
	cleanup();
	delete window.desktop;
});

describe("DesktopGate", () => {
	it("blocks the app until a folder is chosen", async () => {
		const { api } = fakeDesktop(
			{ status: "none" },
			{ choose: { status: "ready", path: "D:\\Notes" } },
		);
		render(<DesktopGate><p>the app</p></DesktopGate>);
		expect(await screen.findByText("Choose your DTDTasks folder")).toBeInTheDocument();
		expect(screen.queryByText("the app")).not.toBeInTheDocument();

		await userEvent.click(screen.getByRole("button", { name: /choose folder/i }));
		expect(await screen.findByText("the app")).toBeInTheDocument();
		expect(api.folder.choose).toHaveBeenCalled();
	});

	it("asks before using a folder that already has files", async () => {
		const { api } = fakeDesktop(
			{ status: "needs-confirm", path: "D:\\Stuff", reason: "not-empty" },
			{ confirm: { status: "ready", path: "D:\\Stuff" } },
		);
		render(<DesktopGate><p>the app</p></DesktopGate>);
		expect(await screen.findByText("This folder isn't empty")).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: "Use this folder" }));
		expect(await screen.findByText("the app")).toBeInTheDocument();
		expect(api.folder.confirm).toHaveBeenCalled();
	});

	it("shows a recovery screen and never silently creates a new folder", async () => {
		const { api } = fakeDesktop(
			{ status: "problem", path: "E:\\Gone", problem: "missing" },
			{ retry: { status: "ready", path: "E:\\Gone" } },
		);
		render(<DesktopGate><p>the app</p></DesktopGate>);
		expect(await screen.findByRole("alert")).toHaveTextContent(/can't be found/i);
		expect(screen.queryByText("the app")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: /choose another folder/i })).toBeInTheDocument();

		await userEvent.click(screen.getByRole("button", { name: "Try again" }));
		expect(await screen.findByText("the app")).toBeInTheDocument();
		expect(api.folder.retry).toHaveBeenCalled();
	});

	it("offers no retry for a folder from a newer version", async () => {
		fakeDesktop({ status: "problem", path: "E:\\New", problem: "newer-format" });
		render(<DesktopGate><p>the app</p></DesktopGate>);
		await screen.findByRole("alert");
		expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
	});

	it("saves everything when the shell announces the window is closing", async () => {
		const { runBeforeClose, api } = fakeDesktop({ status: "ready", path: "D:\\Notes" });
		render(<DesktopGate><p>the app</p></DesktopGate>);
		await screen.findByText("the app");
		await waitFor(() => expect(api.onBeforeClose).toHaveBeenCalled());
		await expect(runBeforeClose()).resolves.toBeUndefined();
	});

	it("explains itself when opened outside the desktop shell", async () => {
		render(<DesktopGate><p>the app</p></DesktopGate>);
		expect(await screen.findByText("Desktop app required")).toBeInTheDocument();
	});
});
