import "fake-indexeddb/auto";
import "@testing-library/jest-dom";
import { IDBFactory } from "fake-indexeddb";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import JournalComposer from "@src/features/home/components/timeline/JournalComposer";
import { getDB, resetDBForTests } from "@src/lib/db/database";
import * as journalRepo from "@src/lib/db/journalRepo";
import { toLocalDay } from "@src/lib/utils/isoDate";

const resize = vi.hoisted(() => vi.fn());
vi.mock("@src/lib/utils/imageResize", () => ({ resizeImageToJpeg: resize }));

const storedNotes = async () => (await getDB()).getAll("journal");
const png = () => new File(["x"], "a.png", { type: "image/png" });

const setup = () => {
	const onPosted = vi.fn();
	const showNotification = vi.fn();
	render(
		<JournalComposer onPosted={onPosted} showNotification={showNotification} />,
	);
	return { onPosted, showNotification, user: userEvent.setup() };
};

beforeEach(async () => {
	await resetDBForTests();
	globalThis.indexedDB = new IDBFactory();
	resize.mockReset();
	resize.mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" }));
	URL.createObjectURL = vi.fn(() => "blob:preview");
	URL.revokeObjectURL = vi.fn();
	vi.restoreAllMocks();
});

describe("JournalComposer", () => {
	it("has no date control and says notes are saved for today", () => {
		setup();
		const form = screen.getByRole("form", { name: "Write a journal note" });
		expect(
			form.querySelector('input[type="date"], input[type="datetime-local"]'),
		).toBeNull();
		expect(
			screen.getAllByText("Notes are saved for today.").length,
		).toBeGreaterThan(0);
	});

	it("keeps Post disabled until there is something to post", async () => {
		const { user } = setup();
		const post = screen.getByRole("button", { name: "Post" });
		expect(post).toBeDisabled();
		await user.type(screen.getByRole("textbox", { name: "Note" }), "   ");
		expect(post).toBeDisabled();
		await user.type(screen.getByRole("textbox", { name: "Note" }), "hi");
		expect(post).toBeEnabled();
	});

	it("counts characters and caps the note at 1000", async () => {
		const { user } = setup();
		const box = screen.getByRole("textbox", { name: "Note" });
		expect(screen.getByText("0/1000")).toBeInTheDocument();
		await user.type(box, "hello");
		expect(screen.getByText("5/1000")).toBeInTheDocument();
		expect(box).toHaveAttribute("maxlength", "1000");
	});

	it("does not steal focus when it mounts", () => {
		setup();
		expect(screen.getByRole("textbox", { name: "Note" })).not.toHaveFocus();
	});

	it("saves a note for now with mood and tags, then resets and reloads the feed", async () => {
		const { user, onPosted, showNotification } = setup();
		const before = Date.now();

		await user.type(screen.getByRole("textbox", { name: "Note" }), "A good day");
		await user.click(screen.getByRole("button", { name: "Great mood" }));
		await user.type(
			screen.getByRole("textbox", { name: "Add a tag" }),
			"#Work,home{Enter}work{Enter}",
		);
		await user.click(screen.getByRole("button", { name: "Post" }));

		await waitFor(() => expect(onPosted).toHaveBeenCalledTimes(1));
		const [note] = await storedNotes();
		expect(note).toMatchObject({
			text: "A good day",
			mood: 5,
			tags: ["Work", "home"],
		});
		expect(note.createdAt).toBeGreaterThanOrEqual(before);
		expect(toLocalDay(note.createdAt)).toBe(toLocalDay(Date.now()));
		expect(showNotification).toHaveBeenCalledWith("Note saved", "success");
		expect(screen.getByRole("textbox", { name: "Note" })).toHaveValue("");
		expect(screen.getByRole("button", { name: "Great mood" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);
		expect(screen.queryByText("#Work")).toBeNull();
	});

	it("posts with Ctrl+Enter and includes a tag still being typed", async () => {
		const { user, onPosted } = setup();
		await user.type(screen.getByRole("textbox", { name: "Add a tag" }), "draft");
		await user.type(
			screen.getByRole("textbox", { name: "Note" }),
			"quick{Control>}{Enter}{/Control}",
		);
		await waitFor(() => expect(onPosted).toHaveBeenCalled());
		expect((await storedNotes())[0]).toMatchObject({
			text: "quick",
			tags: ["draft"],
		});
	});

	it("toggles mood off when the same one is pressed again", async () => {
		const { user } = setup();
		const mood = screen.getByRole("button", { name: "Good mood" });
		await user.click(mood);
		expect(mood).toHaveAttribute("aria-pressed", "true");
		await user.click(mood);
		expect(mood).toHaveAttribute("aria-pressed", "false");
	});

	it("removes a tag chip", async () => {
		const { user } = setup();
		await user.type(
			screen.getByRole("textbox", { name: "Add a tag" }),
			"keep,drop{Enter}",
		);
		await user.click(screen.getByRole("button", { name: "Remove tag drop" }));
		expect(screen.getByText("#keep")).toBeInTheDocument();
		expect(screen.queryByText("#drop")).toBeNull();
	});

	it("attaches a resized image, shows a preview and stores it with the note", async () => {
		const { user, onPosted } = setup();
		const file = png();
		await user.upload(screen.getByLabelText("Attach an image"), file);

		expect(resize).toHaveBeenCalledWith(file);
		expect(await screen.findByAltText("Selected attachment")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Post" }));
		await waitFor(() => expect(onPosted).toHaveBeenCalled());

		const [note] = await storedNotes();
		expect(note.imageId).toBeTruthy();
		expect(
			await (await getDB()).get("journalImages", note.imageId as string),
		).toBeTruthy();
		expect(screen.queryByAltText("Selected attachment")).toBeNull();
	});

	it("lets an image be posted without text and can discard it", async () => {
		const { user } = setup();
		await user.upload(screen.getByLabelText("Attach an image"), png());
		await screen.findByAltText("Selected attachment");
		expect(screen.getByRole("button", { name: "Post" })).toBeEnabled();
		await user.click(screen.getByRole("button", { name: "Remove image" }));
		expect(screen.queryByAltText("Selected attachment")).toBeNull();
		expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
	});

	it("shows a readable error when the image cannot be processed", async () => {
		resize.mockRejectedValue(new Error("Could not process this image."));
		const { user } = setup();
		await user.upload(screen.getByLabelText("Attach an image"), png());
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Could not process this image.",
		);
	});

	it("keeps the draft, shows the error and removes the orphan image when saving fails", async () => {
		vi.spyOn(journalRepo, "addJournalEntry").mockRejectedValueOnce(
			new Error("Storage is full."),
		);
		const { user, onPosted } = setup();
		await user.type(screen.getByRole("textbox", { name: "Note" }), "keep me");
		await user.upload(screen.getByLabelText("Attach an image"), png());
		await screen.findByAltText("Selected attachment");
		await user.click(screen.getByRole("button", { name: "Post" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Storage is full.",
		);
		expect(onPosted).not.toHaveBeenCalled();
		expect(screen.getByRole("textbox", { name: "Note" })).toHaveValue("keep me");
		await waitFor(async () =>
			expect(await (await getDB()).getAll("journalImages")).toEqual([]),
		);
		expect(screen.getByRole("button", { name: "Post" })).toBeEnabled();
	});
});
