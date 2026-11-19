import { newId } from "@src/lib/db/newId";
import type { JournalEntry, JournalImage } from "@src/lib/db/types";
import {
	JOURNAL_NOT_FOUND_MESSAGE,
	buildJournalEntry,
	patchedJournalEntry,
} from "@src/lib/db/journalLogic";
import { JOURNAL_ROOT } from "@src/lib/storage/folder/fileNames";
import {
	type FileProblem,
	createQueue,
	isRecord,
	readChecked,
} from "@src/lib/storage/folder/jsonFiles";
import type { NotesFs } from "@src/lib/storage/folder/notesIndex";
import { scopedFs } from "@src/lib/storage/folder/scopedFs";
import type { JournalStore } from "@src/lib/storage/types";
import { blobToBase64 } from "@src/lib/utils/blobBase64";
import { toLocalDay } from "@src/lib/utils/isoDate";

const DAY_FILE = /^(\d{4}-\d{2}-\d{2})\.json$/;
const YEAR_DIR = /^\d{4}$/;
const IMAGES_DIR = "images";

const MIME_BY_EXT: Record<string, string> = {
	jpg: "image/jpeg",
	png: "image/png",
	webp: "image/webp",
	gif: "image/gif",
};
const EXT_BY_MIME: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"image/gif": "gif",
};

export interface FolderJournalStore extends JournalStore {
	/** Files that could not be read (copied aside, never lost). */
	problems(): Promise<FileProblem[]>;
	/** Adds backup notes and images that are not stored yet (matched by id); never changes existing ones. */
	restore(entries: JournalEntry[], images: JournalImage[]): Promise<JournalRestoreResult>;
}

export interface JournalRestoreResult {
	entriesAdded: number;
	entriesSkipped: number;
	imagesAdded: number;
	imagesSkipped: number;
}

const dayPath = (day: string) => `${day.slice(0, 4)}/${day}.json`;

const dayText = (day: string, entries: JournalEntry[]) =>
	JSON.stringify({ version: 1, day, entries }, null, 2);

const parseDay = (raw: unknown): JournalEntry[] => {
	if (!isRecord(raw) || !Array.isArray(raw.entries)) throw new Error("Not a journal day file");
	const entries = raw.entries.filter(
		(entry): entry is JournalEntry =>
			isRecord(entry) &&
			typeof entry.id === "string" &&
			typeof entry.text === "string" &&
			typeof entry.createdAt === "number" &&
			Number.isFinite(entry.createdAt),
	);
	if (entries.length !== raw.entries.length) throw new Error("Some entries in this file are not valid");
	return entries;
};

const base64ToBlob = (base64: string, type: string): Blob => {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return new Blob([bytes], { type });
};

/**
 * The journal kept as `<data folder>/Journal/<year>/<YYYY-MM-DD>.json`, every
 * note written that local day in one file, and the pictures as real files in
 * `Journal/images/`. A note never changes day (createdAt is fixed), so editing
 * one only rewrites its own day file. Day files are read when a screen needs
 * them, not all at start.
 */
export const createFolderJournalStore = (
	fs: NotesFs,
	root: string = JOURNAL_ROOT,
): FolderJournalStore => {
	const dir = scopedFs(fs, root);
	const problems: FileProblem[] = [];
	const enqueue = createQueue();

	/** Days that have a file, sorted oldest first; null until the folder is listed. */
	let dayList: string[] | null = null;
	const days = new Map<string, JournalEntry[]>();
	const dayOfEntry = new Map<string, string>();
	const imageFiles = new Map<string, string>();

	const listDays = async (): Promise<string[]> => {
		if (dayList) return dayList;
		await fs.mkdir(root);
		const found: string[] = [];
		for (const year of await dir.list("")) {
			if (year.kind !== "dir" || !YEAR_DIR.test(year.name)) continue;
			for (const file of await dir.list(year.name)) {
				const match = file.kind === "file" ? DAY_FILE.exec(file.name) : null;
				if (match && match[1].startsWith(year.name)) found.push(match[1]);
			}
		}
		dayList = found.sort();
		return dayList;
	};

	const loadDay = async (day: string): Promise<JournalEntry[]> => {
		const cached = days.get(day);
		if (cached) return cached;
		const entries = (await readChecked(dir, dayPath(day), parseDay, problems)) ?? [];
		days.set(day, entries);
		for (const entry of entries) dayOfEntry.set(entry.id, day);
		return entries;
	};

	const writeDay = async (day: string): Promise<void> => {
		const entries = days.get(day) ?? [];
		const list = await listDays();
		if (entries.length === 0) {
			if (list.includes(day)) {
				await dir.trash(dayPath(day));
				list.splice(list.indexOf(day), 1);
			}
			days.delete(day);
			return;
		}
		await dir.writeText(dayPath(day), dayText(day, entries));
		if (!list.includes(day)) {
			list.push(day);
			list.sort();
		}
	};

	const findDay = async (id: string): Promise<string | null> => {
		const known = dayOfEntry.get(id);
		if (known) return known;
		for (const day of [...(await listDays())].reverse()) {
			await loadDay(day);
			const found = dayOfEntry.get(id);
			if (found) return found;
		}
		return null;
	};

	const imageFileFor = async (id: string): Promise<string | null> => {
		const known = imageFiles.get(id);
		if (known) return known;
		const match = (await dir.list(IMAGES_DIR)).find(
			(entry) => entry.kind === "file" && entry.name.startsWith(`${id}.`),
		);
		if (!match) return null;
		imageFiles.set(id, match.name);
		return match.name;
	};

	const entriesBetween = async (fromDay: string, toDay: string): Promise<JournalEntry[]> => {
		const out: JournalEntry[] = [];
		for (const day of await listDays()) {
			if (day < fromDay || day > toDay) continue;
			out.push(...(await loadDay(day)));
		}
		return out;
	};

	return {
		problems: async () => [...problems],

		add: (input) =>
			enqueue(async () => {
				const entry = buildJournalEntry(input, newId(), Date.now());
				const day = toLocalDay(entry.createdAt);
				(await loadDay(day)).push(entry);
				dayOfEntry.set(entry.id, day);
				await writeDay(day);
				return structuredClone(entry);
			}),

		update: (id, patch) =>
			enqueue(async () => {
				const day = await findDay(id);
				const entries = day ? await loadDay(day) : [];
				const index = entries.findIndex((entry) => entry.id === id);
				if (!day || index === -1) throw new Error(JOURNAL_NOT_FOUND_MESSAGE);
				const next = patchedJournalEntry(entries[index], patch, Date.now());
				entries[index] = next;
				await writeDay(day);
				return structuredClone(next);
			}),

		remove: (id) =>
			enqueue(async () => {
				const day = await findDay(id);
				if (!day) return;
				const entries = await loadDay(day);
				const index = entries.findIndex((entry) => entry.id === id);
				if (index === -1) return;
				const [removed] = entries.splice(index, 1);
				dayOfEntry.delete(id);
				await writeDay(day);
				if (removed.imageId) {
					const file = await imageFileFor(removed.imageId);
					if (file) {
						await dir.trash(`${IMAGES_DIR}/${file}`);
						imageFiles.delete(removed.imageId);
					}
				}
			}),

		inRange: (fromMs, toMs) =>
			enqueue(async () => {
				if (toMs <= fromMs) return [];
				const entries = await entriesBetween(toLocalDay(fromMs), toLocalDay(toMs - 1));
				return entries
					.filter((entry) => entry.createdAt >= fromMs && entry.createdAt < toMs)
					.sort((a, b) => b.createdAt - a.createdAt)
					.map((entry) => structuredClone(entry));
			}),

		onThisDay: (reference = new Date()) =>
			enqueue(async () => {
				const list = await listDays();
				if (list.length === 0) return [];
				const month = reference.getMonth();
				const day = reference.getDate();
				const firstYear = Number(list[0].slice(0, 4));
				const found: JournalEntry[] = [];
				for (let year = reference.getFullYear() - 1; year >= firstYear; year--) {
					// Feb 29 rolls into March in non-leap years: skip those years.
					if (new Date(year, month, day).getMonth() !== month) continue;
					const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
					if (!list.includes(key)) continue;
					found.push(
						...[...(await loadDay(key))]
							.sort((a, b) => b.createdAt - a.createdAt)
							.map((entry) => structuredClone(entry)),
					);
				}
				return found;
			}),

		timeBefore: (beforeMs) =>
			enqueue(async () => {
				const last = toLocalDay(beforeMs);
				for (const day of [...(await listDays())].reverse()) {
					if (day > last) continue;
					const earlier = (await loadDay(day))
						.filter((entry) => entry.createdAt < beforeMs)
						.map((entry) => entry.createdAt);
					if (earlier.length > 0) return Math.max(...earlier);
				}
				return null;
			}),

		restore: (entries, images) =>
			enqueue(async () => {
				const result: JournalRestoreResult = {
					entriesAdded: 0,
					entriesSkipped: 0,
					imagesAdded: 0,
					imagesSkipped: 0,
				};
				for (const image of images) {
					if (await imageFileFor(image.id)) {
						result.imagesSkipped++;
						continue;
					}
					const file = `${image.id}.${EXT_BY_MIME[image.blob.type] ?? "bin"}`;
					await dir.writeBinary(`${IMAGES_DIR}/${file}`, await blobToBase64(image.blob));
					imageFiles.set(image.id, file);
					result.imagesAdded++;
				}
				// Every day file is read once so a note that is already here is never added twice.
				for (const day of await listDays()) await loadDay(day);
				const touched = new Set<string>();
				for (const entry of entries) {
					if (dayOfEntry.has(entry.id)) {
						result.entriesSkipped++;
						continue;
					}
					const day = toLocalDay(entry.createdAt);
					(await loadDay(day)).push(entry);
					dayOfEntry.set(entry.id, day);
					touched.add(day);
					result.entriesAdded++;
				}
				for (const day of touched) {
					days.get(day)?.sort((a, b) => a.createdAt - b.createdAt);
					await writeDay(day);
				}
				return result;
			}),

		putImage: (blob) =>
			enqueue(async () => {
				const id = newId();
				const file = `${id}.${EXT_BY_MIME[blob.type] ?? "bin"}`;
				await dir.writeBinary(`${IMAGES_DIR}/${file}`, await blobToBase64(blob));
				imageFiles.set(id, file);
				return id;
			}),

		getImage: (id) =>
			enqueue(async () => {
				const file = await imageFileFor(id);
				if (!file) return null;
				const base64 = await dir.readBinary(`${IMAGES_DIR}/${file}`);
				if (base64 === null) return null;
				const ext = file.slice(file.lastIndexOf(".") + 1);
				return base64ToBlob(base64, MIME_BY_EXT[ext] ?? "application/octet-stream");
			}),

		deleteImage: (id) =>
			enqueue(async () => {
				const file = await imageFileFor(id);
				if (!file) return;
				await dir.trash(`${IMAGES_DIR}/${file}`);
				imageFiles.delete(id);
			}),
	};
};
