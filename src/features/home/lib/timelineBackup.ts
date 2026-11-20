import {
	getAllTimelineData,
	mergeTimelineData,
	type MergeResult,
	type TimelineData,
} from "@src/lib/db/timelineBackupRepo";
import { isJournalMood } from "@src/lib/db/journalValidation";
import {
	JOURNAL_TEXT_MAX,
	type JournalEntry,
	type MarkdownAction,
	type MarkdownLogEntry,
} from "@src/lib/db/types";
import { SCHEMA_VERSION } from "@src/lib/utils/schemaVersion";
import { UploadError } from "@src/lib/utils/uploadError";

export const TIMELINE_BACKUP_FILE = "timeline-backup.json";

export interface TimelineBackup {
	schemaVersion: number;
	journal: JournalEntry[];
	markdownLog: MarkdownLogEntry[];
}

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
	typeof value === "string" && value.length > 0;

const isFiniteNumber = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value);

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ACTIONS: readonly MarkdownAction[] = [
	"created",
	"edited",
	"renamed",
	"deleted",
];

// --- Export ---------------------------------------------------------------

export const serializeTimeline = async (
	data: TimelineData,
): Promise<TimelineBackup> => ({
	schemaVersion: SCHEMA_VERSION,
	journal: data.journal,
	markdownLog: data.markdownLog,
});

export const buildTimelineBackup = async (): Promise<TimelineBackup> =>
	serializeTimeline(await getAllTimelineData());

// --- Import: validation ---------------------------------------------------

const checkJournal = (value: unknown): string | null => {
	if (!isRecord(value)) return "is not an object";
	if (!isNonEmptyString(value.id)) return 'is missing an "id"';
	if (typeof value.text !== "string") return 'is missing its "text"';
	if (value.text.length > JOURNAL_TEXT_MAX) {
		return `has more than ${JOURNAL_TEXT_MAX} characters`;
	}
	if (!isFiniteNumber(value.createdAt)) return 'has an invalid "createdAt"';
	if (value.updatedAt !== undefined && !isFiniteNumber(value.updatedAt)) {
		return 'has an invalid "updatedAt"';
	}
	if (value.mood !== undefined && !isJournalMood(value.mood)) {
		return 'has an invalid "mood" (expected 1 to 5)';
	}
	if (
		value.tags !== undefined &&
		!(
			Array.isArray(value.tags) &&
			value.tags.every((tag) => typeof tag === "string")
		)
	) {
		return 'has invalid "tags"';
	}
	return null;
};

const checkLog = (value: unknown): string | null => {
	if (!isRecord(value)) return "is not an object";
	if (!isNonEmptyString(value.id)) return 'is missing an "id"';
	if (!isNonEmptyString(value.fileId)) return 'is missing a "fileId"';
	if (typeof value.name !== "string") return 'is missing its "name"';
	if (!ACTIONS.includes(value.action as MarkdownAction)) {
		return 'has an unknown "action"';
	}
	if (typeof value.day !== "string" || !DAY_PATTERN.test(value.day)) {
		return 'has an invalid "day" (expected YYYY-MM-DD)';
	}
	if (!isFiniteNumber(value.createdAt) || !isFiniteNumber(value.updatedAt)) {
		return "has an invalid timestamp";
	}
	if (value.meta !== undefined) {
		if (!isRecord(value.meta)) return 'has an invalid "meta"';
		if (
			value.meta.oldName !== undefined &&
			typeof value.meta.oldName !== "string"
		) {
			return 'has an invalid "meta.oldName"';
		}
		if (
			value.meta.isFolder !== undefined &&
			typeof value.meta.isFolder !== "boolean"
		) {
			return 'has an invalid "meta.isFolder"';
		}
	}
	return null;
};

const readList = (
	root: JsonRecord,
	key: string,
	label: string,
	check: (value: unknown) => string | null,
	problems: string[],
): unknown[] => {
	const list = root[key];
	if (list === undefined) return [];
	if (!Array.isArray(list)) {
		problems.push(`"${key}" must be a list`);
		return [];
	}
	list.forEach((item, index) => {
		const problem = check(item);
		if (problem) problems.push(`${label} ${index + 1} ${problem}`);
	});
	return list;
};

/**
 * Validates a parsed backup and turns it into rows ready to merge. Files made
 * before schemaVersion existed are accepted. Nothing is stored here, and any
 * malformed entry rejects the whole file with a message saying which one, so a
 * bad file never leaves a half-imported timeline.
 */
export const parseTimelineBackup = (raw: unknown): TimelineData => {
	if (
		!isRecord(raw) ||
		!("journal" in raw || "journalImages" in raw || "markdownLog" in raw)
	) {
		throw new UploadError("This doesn't look like a Timeline backup file");
	}
	if (raw.schemaVersion !== undefined) {
		if (!isFiniteNumber(raw.schemaVersion)) {
			throw new UploadError("This backup has an invalid schemaVersion");
		}
		if (raw.schemaVersion > SCHEMA_VERSION) {
			throw new UploadError(
				"This backup was made by a newer version of the app. Update the app and try again.",
			);
		}
	}

	const problems: string[] = [];
	const journal = readList(raw, "journal", "Journal entry", checkJournal, problems);
	// Older backups carry journal pictures; the app no longer keeps them, so they are skipped.
	const log = readList(raw, "markdownLog", "Activity row", checkLog, problems);

	if (problems.length > 0) {
		const shown = problems.slice(0, 3).join("; ");
		const more = problems.length > 3 ? ` (and ${problems.length - 3} more)` : "";
		throw new UploadError(`Backup has invalid data: ${shown}${more}`);
	}

	return {
		journal: (journal as JournalEntry[]).map((entry) => {
			// Older backups name a picture the app no longer keeps.
			const copy: JournalEntry & { imageId?: unknown } = { ...entry };
			delete copy.imageId;
			return copy;
		}),
		markdownLog: log as MarkdownLogEntry[],
	};
};

export const describeTimelineImport = (result: MergeResult): string => {
	const added: string[] = [];
	if (result.journalAdded) added.push(`${result.journalAdded} notes`);
	if (result.logAdded) added.push(`${result.logAdded} activity rows`);
	const skipped =
		result.journalSkipped + result.logSkipped;

	if (added.length === 0) {
		return skipped > 0
			? `Nothing new to import (${skipped} already existed)`
			: "The backup was empty";
	}
	const note = skipped > 0 ? ` (${skipped} duplicates skipped)` : "";
	return `Imported ${added.join(", ")}${note}`;
};

/** Reads a backup file and merges it into the timeline. Returns the message to show. */
export const importTimelineFile = async (file: File): Promise<string> => {
	let raw: unknown;
	try {
		raw = JSON.parse(await file.text());
	} catch {
		throw new UploadError("That file is not valid JSON");
	}
	const data = parseTimelineBackup(raw);
	return describeTimelineImport(await mergeTimelineData(data));
};
