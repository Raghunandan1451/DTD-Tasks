import type { ExpenseEntry, FinanceState } from "@src/features/finance/type";
import type { ExpensesState } from "@src/lib/store/slices/expensesSlice";

export const FINANCE_BACKUP_FILE = "finance-backup.json";
export const FINANCE_BACKUP_VERSION = 1;

/** One file holding both slices, so a restore is a single upload. */
export interface FinanceBackup {
	version: number;
	finance?: FinanceState;
	expenses?: ExpensesState;
}

export interface ParsedFinanceBackup {
	finance?: FinanceState;
	expenses?: ExpenseEntry[];
	/** Expense entries dropped because they were malformed */
	skippedEntries: number;
}

const UNRECOGNISED =
	"This doesn't look like a finance or expenses backup file";

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const buildFinanceBackup = (
	finance?: FinanceState,
	expenses?: ExpensesState,
): FinanceBackup => ({
	version: FINANCE_BACKUP_VERSION,
	...(finance ? { finance } : {}),
	...(expenses ? { expenses } : {}),
});

const looksLikeFinance = (value: JsonRecord): boolean =>
	Array.isArray(value.groups) ||
	typeof value.currentBalance === "number" ||
	("salary" in value && (value.salary === null || isRecord(value.salary)));

/** Throws on anything that would corrupt the slice if merged into it. */
const validateFinance = (value: JsonRecord): FinanceState => {
	if (!looksLikeFinance(value)) throw new Error(UNRECOGNISED);

	if (
		"groups" in value &&
		!(
			Array.isArray(value.groups) &&
			value.groups.every((group) => typeof group === "string")
		)
	) {
		throw new Error("Finance data has an invalid group list");
	}
	if ("currentBalance" in value && typeof value.currentBalance !== "number") {
		throw new Error("Finance data has an invalid current balance");
	}
	if (isRecord(value.salary)) {
		const { amount, dayOfMonth } = value.salary;
		if (typeof amount !== "number" || typeof dayOfMonth !== "number") {
			throw new Error("Finance data has an invalid salary");
		}
	}
	return value as unknown as FinanceState;
};

const isValidEntry = (value: unknown): value is ExpenseEntry =>
	isRecord(value) &&
	typeof value.id === "string" &&
	typeof value.name === "string" &&
	typeof value.group === "string" &&
	typeof value.date === "string" &&
	DATE_PATTERN.test(value.date) &&
	typeof value.amount === "number" &&
	Number.isFinite(value.amount);

const validateExpenses = (
	entries: unknown[],
): { expenses: ExpenseEntry[]; skipped: number } => {
	const expenses = entries.filter(isValidEntry);
	if (entries.length > 0 && expenses.length === 0) {
		throw new Error("No valid expense entries found in this file");
	}
	return { expenses, skipped: entries.length - expenses.length };
};

/**
 * Reads a combined backup or either legacy file (finance-data.json /
 * expenses-data.json). The type is detected from the content, never the
 * filename, and everything is validated before the caller dispatches.
 */
export const parseFinanceBackup = (raw: unknown): ParsedFinanceBackup => {
	if (!isRecord(raw)) throw new Error(UNRECOGNISED);

	// Combined: { version, finance?, expenses?: { expenses: [...] } }
	if (
		isRecord(raw.finance) ||
		(isRecord(raw.expenses) && Array.isArray(raw.expenses.expenses))
	) {
		const result: ParsedFinanceBackup = { skippedEntries: 0 };
		if (isRecord(raw.finance)) result.finance = validateFinance(raw.finance);
		if (isRecord(raw.expenses)) {
			if (!Array.isArray(raw.expenses.expenses)) {
				throw new Error("Backup has an invalid expenses list");
			}
			const { expenses, skipped } = validateExpenses(raw.expenses.expenses);
			result.expenses = expenses;
			result.skippedEntries = skipped;
		}
		return result;
	}

	// Legacy expenses-data.json: { expenses: [...], selectedDate, loaded }
	if (Array.isArray(raw.expenses)) {
		const { expenses, skipped } = validateExpenses(raw.expenses);
		return { expenses, skippedEntries: skipped };
	}

	// Legacy finance-data.json: the finance slice itself
	if (looksLikeFinance(raw)) {
		return { finance: validateFinance(raw), skippedEntries: 0 };
	}

	throw new Error(UNRECOGNISED);
};

export const parseFinanceBackupText = (
	text: string,
	fileName = "file",
): ParsedFinanceBackup => {
	let json: unknown;
	try {
		json = JSON.parse(text);
	} catch {
		throw new Error(`${fileName} is not valid JSON`);
	}
	try {
		return parseFinanceBackup(json);
	} catch (error) {
		const reason = error instanceof Error ? error.message : UNRECOGNISED;
		throw new Error(`${fileName}: ${reason}`);
	}
};

/** Combines several parsed files (e.g. both legacy files); later files win per section. */
export const mergeParsedBackups = (
	parsed: ParsedFinanceBackup[],
): ParsedFinanceBackup =>
	parsed.reduce<ParsedFinanceBackup>(
		(merged, next) => ({
			finance: next.finance ?? merged.finance,
			expenses: next.expenses ?? merged.expenses,
			skippedEntries: merged.skippedEntries + next.skippedEntries,
		}),
		{ skippedEntries: 0 },
	);
