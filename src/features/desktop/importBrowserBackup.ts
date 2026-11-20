import JSZip from "jszip";
import store from "@src/lib/store/store";
import { hydrateMarkdown } from "@src/lib/store/thunks/markdownThunk";
import { hydrateExpenses } from "@src/lib/store/thunks/expenseThunk";
import { hydrateFinance } from "@src/lib/store/thunks/financeThunk";
import { setFileState } from "@src/lib/store/slices/markdownSlice";
import { setExpenses } from "@src/lib/store/slices/expensesSlice";
import { setFinanceState } from "@src/lib/store/slices/financeSlice";
import { mergeBoards } from "@src/lib/storage";
import {
	describeBoardsImport,
	parseBoardsBackup,
} from "@src/features/nodes/lib/boardBackup";
import {
	describeTimelineImport,
	parseTimelineBackup,
} from "@src/features/home/lib/timelineBackup";
import { mergeTimelineData } from "@src/lib/db/timelineBackupRepo";
import {
	mergeParsedBackups,
	parseFinanceBackup,
	type ParsedFinanceBackup,
} from "@src/features/finance/lib/financeBackup";
import { isFolderZip, readFolderZip } from "@src/lib/utils/download/folderLayout";
import { buildFinanceBackup } from "@src/features/finance/lib/financeBackup";
import { SCHEMA_VERSION } from "@src/lib/utils/schemaVersion";
import {
	mergeImportedNotes,
	parseNotesBackup,
} from "@src/features/markdown/lib/mergeNotes";

/** What an import did, for the person to read. Nothing here is a stack trace. */
export interface ImportReport {
	done: string[];
	problems: string[];
}

type Kind = "notes" | "boards" | "timeline" | "finance";
interface Source {
	kind: Kind;
	from: string;
	raw: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** The inner file names the browser exports use, mapped to what they hold. */
const KNOWN_NAMES: Record<string, Kind> = {
	"file-manager-data.json": "notes",
	"boards-backup.json": "boards",
	"timeline-backup.json": "timeline",
	"finance-backup.json": "finance",
	"finance-data.json": "finance",
	"expenses-data.json": "finance",
};

/** Works out what a JSON file is from its content, never from its name. */
const classify = (raw: unknown): Kind | null => {
	if (!isRecord(raw)) return null;
	if (Array.isArray(raw.boards)) return "boards";
	if ("journal" in raw || "journalImages" in raw || "markdownLog" in raw) return "timeline";
	if (Array.isArray(raw.files)) return "notes";
	try {
		parseFinanceBackup(raw);
		return "finance";
	} catch {
		return null;
	}
};

/** File text, also where Blob.text is missing (older engines, test environments). */
const readText = (file: File): Promise<string> =>
	typeof file.text === "function"
		? file.text()
		: new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onerror = () => reject(reader.error ?? new Error("Could not read the file"));
				reader.onload = () => resolve(String(reader.result));
				reader.readAsText(file);
			});

const readSources = async (file: File, problems: string[]): Promise<Source[]> => {
	if (file.name.toLowerCase().endsWith(".zip")) {
		let zip: JSZip;
		try {
			zip = await JSZip.loadAsync(file);
		} catch {
			problems.push(`${file.name}: not a valid ZIP file`);
			return [];
		}
		// A ZIP laid out like a data folder (what the Home download makes, or a zipped folder).
		if (isFolderZip(zip)) {
			try {
				const data = await readFolderZip(zip);
				const found: Source[] = [];
				if (data.notes) {
					found.push({ kind: "notes", from: `${file.name} / Notes`, raw: { files: data.notes.files } });
				}
				if (data.boards) {
					found.push({ kind: "boards", from: `${file.name} / Boards`, raw: { schemaVersion: SCHEMA_VERSION, boards: data.boards } });
				}
				if (data.finance || data.expenses) {
					found.push({ kind: "finance", from: `${file.name} / Finance`, raw: buildFinanceBackup(data.finance, data.expenses) });
				}
				if (data.journal || data.activity) {
					found.push({
						kind: "timeline",
						from: `${file.name} / Journal`,
						raw: { schemaVersion: SCHEMA_VERSION, journal: data.journal ?? [], markdownLog: data.activity ?? [] },
					});
				}
				if (found.length === 0) problems.push(`${file.name}: the folder has no data in it`);
				return found;
			} catch (error) {
				problems.push(`${file.name}: ${error instanceof Error ? error.message : "could not be read"}`);
				return [];
			}
		}
		const sources: Source[] = [];
		for (const entry of Object.values(zip.files)) {
			if (entry.dir) continue;
			const kind = KNOWN_NAMES[entry.name.split("/").pop() ?? ""];
			if (!kind) continue;
			try {
				sources.push({ kind, from: `${file.name} / ${entry.name}`, raw: JSON.parse(await entry.async("string")) });
			} catch {
				problems.push(`${file.name} / ${entry.name}: not valid JSON`);
			}
		}
		if (sources.length === 0) problems.push(`${file.name}: no backup files found inside`);
		return sources;
	}
	try {
		const raw: unknown = JSON.parse(await readText(file));
		const kind = classify(raw);
		if (!kind) {
			problems.push(`${file.name}: this doesn't look like an DTDTasks backup`);
			return [];
		}
		return [{ kind, from: file.name, raw }];
	} catch {
		problems.push(`${file.name}: not valid JSON`);
		return [];
	}
};

const importNotes = async (sources: Source[]): Promise<string> => {
	// The folder's own notes must be loaded first, or the merge would start from an empty tree.
	if (!store.getState().fileManager.loaded) await store.dispatch(hydrateMarkdown());
	let files = store.getState().fileManager.files;
	let added = 0;
	let renamed = 0;
	let skipped = 0;
	for (const source of sources) {
		const merged = mergeImportedNotes(files, parseNotesBackup(source.raw));
		files = merged.files;
		added += merged.added;
		renamed += merged.renamed;
		skipped += merged.skipped;
	}
	if (added > 0) store.dispatch(setFileState({ ...store.getState().fileManager, files }));
	if (added === 0) return `Notes: nothing new (${skipped} already there)`;
	const notes = [renamed ? `${renamed} under a new name because the name was taken` : "", skipped ? `${skipped} identical skipped` : ""]
		.filter(Boolean)
		.join(", ");
	return `Notes: added ${added}${notes ? ` (${notes})` : ""}`;
};

const importFinance = async (sources: Source[]): Promise<string> => {
	if (!store.getState().finance.loaded) await store.dispatch(hydrateFinance());
	if (!store.getState().expenses.loaded) await store.dispatch(hydrateExpenses());
	const merged: ParsedFinanceBackup = mergeParsedBackups(sources.map((s) => parseFinanceBackup(s.raw)));
	const parts: string[] = [];
	if (merged.expenses) {
		const current = store.getState().expenses.expenses;
		const known = new Set(current.map((entry) => entry.id));
		const fresh = merged.expenses.filter((entry) => !known.has(entry.id));
		if (fresh.length > 0) store.dispatch(setExpenses([...current, ...fresh]));
		parts.push(`${fresh.length} expenses added${merged.expenses.length > fresh.length ? ` (${merged.expenses.length - fresh.length} already there)` : ""}`);
	}
	if (merged.finance) {
		const now = store.getState().finance;
		// Settings are replaced only on a fresh folder; otherwise the existing ones are kept.
		if (!now.salary && !now.recurring?.length) {
			store.dispatch(setFinanceState(merged.finance));
			parts.push("finance settings imported");
		} else {
			parts.push("finance settings kept as they are (this folder already has some)");
		}
	}
	if (merged.skippedEntries > 0) parts.push(`${merged.skippedEntries} invalid entries skipped`);
	return `Finance: ${parts.join(", ")}`;
};

/**
 * Imports files made by the browser version (the Download buttons there): the
 * notes, boards, finance and timeline JSON files, or the ZIPs that hold them.
 * What each file is comes from its content. Everything is added next to what
 * the folder already has; nothing existing is overwritten.
 */
export const importBrowserBackup = async (files: File[]): Promise<ImportReport> => {
	const report: ImportReport = { done: [], problems: [] };
	const sources: Source[] = [];
	for (const file of files) sources.push(...(await readSources(file, report.problems)));

	const group = (kind: Kind) => sources.filter((s) => s.kind === kind);
	const attempt = async (label: string, run: () => Promise<string>) => {
		try {
			report.done.push(await run());
		} catch (error) {
			report.problems.push(`${label}: ${error instanceof Error ? error.message : "could not be imported"}`);
		}
	};

	if (group("notes").length) await attempt("Notes", () => importNotes(group("notes")));
	for (const source of group("boards")) {
		await attempt(`Boards (${source.from})`, async () =>
			`Boards: ${describeBoardsImport(await mergeBoards(parseBoardsBackup(source.raw)))}`);
	}
	for (const source of group("timeline")) {
		await attempt(`Timeline (${source.from})`, async () =>
			`Journal and activity: ${describeTimelineImport(await mergeTimelineData(parseTimelineBackup(source.raw)))}`);
	}
	if (group("finance").length) await attempt("Finance", () => importFinance(group("finance")));

	if (report.done.length === 0 && report.problems.length === 0) {
		report.problems.push("Nothing to import was found in the files you chose.");
	}
	return report;
};
