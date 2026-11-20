import type { ExpenseEntry, FinanceState } from "@src/features/finance/type";
import { buildFinanceBackup, parseFinanceBackup } from "@src/features/finance/lib/financeBackup";
import type { ExpensesState } from "@src/lib/store/slices/expensesSlice";
import {
	type FileProblem,
	createQueue,
	readChecked,
} from "@src/lib/storage/folder/jsonFiles";
import { FINANCE_ROOT } from "@src/lib/storage/folder/fileNames";
import type { NotesFs } from "@src/lib/storage/folder/notesIndex";
import { scopedFs } from "@src/lib/storage/folder/scopedFs";
import type { FinanceStore } from "@src/lib/storage/types";
import { todayISO } from "@src/lib/utils/isoDate";
import { SCHEMA_VERSION } from "@src/lib/utils/schemaVersion";

const SETTINGS_FILE = "settings.json";
const EXPENSES_DIR = "expenses";
const MONTH_FILE = /^(\d{4}-\d{2})\.json$/;

export interface FolderFinanceStore extends FinanceStore {
	/** Files that could not be read (copied aside, never lost). */
	problems(): Promise<FileProblem[]>;
}

const settingsText = (state: FinanceState): string =>
	JSON.stringify(buildFinanceBackup(state), null, 2);

/** One month of expenses in the same shape a combined backup uses, so the same checks apply. */
const monthText = (month: string, expenses: ExpenseEntry[]): string =>
	JSON.stringify(
		{ version: 1, schemaVersion: SCHEMA_VERSION, month, expenses: { expenses } },
		null,
		2,
	);

/**
 * Finance kept as `<data folder>/Finance/settings.json` (salary, groups,
 * recurring items, budgets, balance) plus `Finance/expenses/YYYY-MM.json`, one
 * file per month of entries. Only the files that changed are rewritten, so
 * editing last week never touches last year. Everything is validated with the
 * existing backup checks on load.
 */
export const createFolderFinanceStore = (
	fs: NotesFs,
	root: string = FINANCE_ROOT,
): FolderFinanceStore => {
	const dir = scopedFs(fs, root);
	const problems: FileProblem[] = [];
	const enqueue = createQueue();
	/** The text last written (or read) for each file, to skip identical rewrites. */
	let settingsSaved: string | null = null;
	const monthsSaved = new Map<string, string>();

	const parseSettings = (raw: unknown): FinanceState => {
		const parsed = parseFinanceBackup(raw);
		if (!parsed.finance) throw new Error("No finance settings found in this file");
		return parsed.finance;
	};

	const parseMonth = (raw: unknown): ExpenseEntry[] => {
		const parsed = parseFinanceBackup(raw);
		if (parsed.skippedEntries > 0) {
			throw new Error(`${parsed.skippedEntries} entries in this file are not valid`);
		}
		return parsed.expenses ?? [];
	};

	return {
		problems: async () => [...problems],

		loadFinance: () =>
			enqueue(async () => {
				await fs.mkdir(root);
				const state = await readChecked(dir, SETTINGS_FILE, parseSettings, problems);
				if (state) settingsSaved = settingsText(state);
				return state;
			}),

		saveFinance: (state) =>
			enqueue(async () => {
				const text = settingsText(state);
				if (text === settingsSaved) return;
				await dir.writeText(SETTINGS_FILE, text);
				settingsSaved = text;
			}),

		loadExpenses: () =>
			enqueue(async () => {
				await fs.mkdir(`${root}/${EXPENSES_DIR}`);
				const names = (await dir.list(EXPENSES_DIR))
					.filter((entry) => entry.kind === "file" && MONTH_FILE.test(entry.name))
					.map((entry) => entry.name)
					.sort();
				const expenses: ExpenseEntry[] = [];
				for (const name of names) {
					const month = name.replace(".json", "");
					const path = `${EXPENSES_DIR}/${name}`;
					// A month with some bad entries is copied aside and its good entries still load.
					let entries = await readChecked(dir, path, parseMonth, problems);
					if (entries === null) {
						const text = await dir.readText(path);
						try {
							entries = parseFinanceBackup(JSON.parse(text ?? "")).expenses ?? [];
						} catch {
							entries = [];
						}
					}
					monthsSaved.set(month, monthText(month, entries));
					expenses.push(...entries);
				}
				return { expenses, selectedDate: todayISO(), loaded: true } satisfies ExpensesState;
			}),

		saveExpenses: (state) =>
			enqueue(async () => {
				const byMonth = new Map<string, ExpenseEntry[]>();
				for (const entry of state.expenses) {
					const month = entry.date.slice(0, 7);
					const list = byMonth.get(month) ?? [];
					list.push(entry);
					byMonth.set(month, list);
				}
				for (const [month, entries] of byMonth) {
					const text = monthText(month, entries);
					if (monthsSaved.get(month) === text) continue;
					await dir.writeText(`${EXPENSES_DIR}/${month}.json`, text);
					monthsSaved.set(month, text);
				}
				// A month with no entries left: its file goes to the recycle bin.
				for (const month of [...monthsSaved.keys()]) {
					if (byMonth.has(month)) continue;
					await dir.trash(`${EXPENSES_DIR}/${month}.json`);
					monthsSaved.delete(month);
				}
			}),
	};
};
