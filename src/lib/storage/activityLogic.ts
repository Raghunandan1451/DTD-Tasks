import type { MarkdownAction, MarkdownLogEntry } from "@src/lib/db/types";
import { toLocalDay } from "@src/lib/utils/isoDate";

type LogMeta = MarkdownLogEntry["meta"];

/**
 * Applies one activity event to a list of log rows. [fileId, day, action] is unique, so:
 * - 'edited' upserts and only bumps updatedAt (ten saves a day = one row);
 * - a second 'renamed' on the same day updates the row's name but keeps the
 *   first oldName, so the row still reads "original -> latest";
 * - 'created' and 'deleted' can only happen once per file, so they insert.
 * Returns the row that was added or changed.
 */
export const upsertActivity = (
	rows: MarkdownLogEntry[],
	event: {
		id: string;
		fileId: string;
		name: string;
		action: MarkdownAction;
		meta?: LogMeta;
		now: number;
	},
): MarkdownLogEntry => {
	const { id, fileId, name, action, meta, now } = event;
	const day = toLocalDay(now);
	const index = rows.findIndex(
		(row) => row.fileId === fileId && row.day === day && row.action === action,
	);
	if (index === -1) {
		const row: MarkdownLogEntry = {
			id,
			fileId,
			name,
			action,
			day,
			createdAt: now,
			updatedAt: now,
			...(meta ? { meta } : {}),
		};
		rows.push(row);
		return row;
	}
	const existing = rows[index];
	const row: MarkdownLogEntry =
		action === "edited"
			? { ...existing, updatedAt: now }
			: { ...existing, name, updatedAt: now, meta: { ...meta, ...existing.meta } };
	rows[index] = row;
	return row;
};
