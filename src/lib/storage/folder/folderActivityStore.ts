import type { MarkdownLogEntry } from "@src/lib/db/types";
import { newId } from "@src/lib/db/newId";
import { upsertActivity } from "@src/lib/storage/activityLogic";
import {
	type FileProblem,
	createQueue,
	isRecord,
	readChecked,
} from "@src/lib/storage/folder/jsonFiles";
import type { NotesFs } from "@src/lib/storage/folder/notesIndex";
import { scopedFs } from "@src/lib/storage/folder/scopedFs";
import type { ActivityStore } from "@src/lib/storage/types";
import { toLocalDay } from "@src/lib/utils/isoDate";

/** Hidden app data, so the notes tree never shows it. */
export const ACTIVITY_ROOT = ".dtdtasks/activity";
const MONTH_FILE = /^(\d{4}-\d{2})\.json$/;

export interface FolderActivityStore extends ActivityStore {
	/** Files that could not be read (copied aside, never lost). */
	problems(): Promise<FileProblem[]>;
	/** Adds backup rows not stored yet (same id, or same file + day + action). Returns how many were added and skipped. */
	restore(rows: MarkdownLogEntry[]): Promise<{ added: number; skipped: number }>;
}

const parseMonth = (raw: unknown): MarkdownLogEntry[] => {
	if (!isRecord(raw) || !Array.isArray(raw.entries)) throw new Error("Not an activity file");
	const rows = raw.entries.filter(
		(row): row is MarkdownLogEntry =>
			isRecord(row) &&
			typeof row.id === "string" &&
			typeof row.fileId === "string" &&
			typeof row.name === "string" &&
			typeof row.day === "string" &&
			typeof row.action === "string" &&
			typeof row.createdAt === "number" &&
			typeof row.updatedAt === "number",
	);
	if (rows.length !== raw.entries.length) throw new Error("Some rows in this file are not valid");
	return rows;
};

/**
 * The notes activity log as `.dtdtasks/activity/YYYY-MM.json`, one file per
 * month. Logging an event rewrites only that month, and the same upsert rule as
 * the browser (one row per file, day and action) keeps repeated edits to one row.
 */
export const createFolderActivityStore = (
	fs: NotesFs,
	root: string = ACTIVITY_ROOT,
): FolderActivityStore => {
	const dir = scopedFs(fs, root);
	const problems: FileProblem[] = [];
	const enqueue = createQueue();
	let monthList: string[] | null = null;
	const months = new Map<string, MarkdownLogEntry[]>();

	const listMonths = async (): Promise<string[]> => {
		if (monthList) return monthList;
		await fs.mkdir(root);
		monthList = (await dir.list(""))
			.map((entry) => (entry.kind === "file" ? MONTH_FILE.exec(entry.name)?.[1] : undefined))
			.filter((month): month is string => Boolean(month))
			.sort();
		return monthList;
	};

	const loadMonth = async (month: string): Promise<MarkdownLogEntry[]> => {
		const cached = months.get(month);
		if (cached) return cached;
		const rows = (await readChecked(dir, `${month}.json`, parseMonth, problems)) ?? [];
		months.set(month, rows);
		return rows;
	};

	return {
		problems: async () => [...problems],

		log: (fileId, name, action, meta, now) =>
			enqueue(async () => {
				const month = toLocalDay(now).slice(0, 7);
				const rows = await loadMonth(month);
				upsertActivity(rows, { id: newId(), fileId, name, action, meta, now });
				await dir.writeText(`${month}.json`, JSON.stringify({ version: 1, entries: rows }, null, 2));
				const list = await listMonths();
				if (!list.includes(month)) {
					list.push(month);
					list.sort();
				}
			}),

		restore: (incoming) =>
			enqueue(async () => {
				let added = 0;
				let skipped = 0;
				const touched = new Set<string>();
				for (const row of incoming) {
					const month = row.day.slice(0, 7);
					const rows = await loadMonth(month);
					const duplicate = rows.some(
						(existing) =>
							existing.id === row.id ||
							(existing.fileId === row.fileId &&
								existing.day === row.day &&
								existing.action === row.action),
					);
					if (duplicate) {
						skipped++;
						continue;
					}
					rows.push(row);
					touched.add(month);
					added++;
				}
				const list = await listMonths();
				for (const month of touched) {
					await dir.writeText(
						`${month}.json`,
						JSON.stringify({ version: 1, entries: months.get(month) }, null, 2),
					);
					if (!list.includes(month)) list.push(month);
				}
				list.sort();
				return { added, skipped };
			}),

		inRange: (fromDay, toDay) =>
			enqueue(async () => {
				const out: MarkdownLogEntry[] = [];
				for (const month of await listMonths()) {
					if (month < fromDay.slice(0, 7) || month > toDay.slice(0, 7)) continue;
					for (const row of await loadMonth(month)) {
						if (row.day >= fromDay && row.day <= toDay) out.push(structuredClone(row));
					}
				}
				return out;
			}),

		dayBefore: (beforeDay) =>
			enqueue(async () => {
				for (const month of [...(await listMonths())].reverse()) {
					if (month > beforeDay.slice(0, 7)) continue;
					const earlier = (await loadMonth(month))
						.map((row) => row.day)
						.filter((day) => day < beforeDay);
					if (earlier.length > 0) return earlier.sort().reverse()[0];
				}
				return null;
			}),
	};
};
