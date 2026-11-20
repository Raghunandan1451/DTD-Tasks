import type { NotesFs } from "@src/lib/storage/folder/notesIndex";

/** A file the app could not read. Its text is kept in a `.damaged-<time>.json` copy, never lost. */
export interface FileProblem {
	file: string;
	reason: string;
}

export const stamp = (date = new Date()): string =>
	date.toISOString().slice(0, 19).replace("T", " ").replace(/:/g, "-");

/** A serialised queue: jobs run one at a time, in the order they were added. */
export const createQueue = () => {
	let queue: Promise<unknown> = Promise.resolve();
	return <T>(job: () => Promise<T>): Promise<T> => {
		const run = queue.then(job, job);
		queue = run.catch(() => undefined);
		return run;
	};
};

/**
 * Reads and checks a JSON file. A missing file is `null`. A file that cannot be
 * read or fails the check is copied to `<name>.damaged-<time>.json` first, so a
 * later save of the same path never destroys what the user had, and the problem
 * is reported.
 */
export const readChecked = async <T>(
	fs: NotesFs,
	path: string,
	check: (raw: unknown) => T,
	problems: FileProblem[],
): Promise<T | null> => {
	const text = await fs.readText(path);
	if (text === null) return null;
	try {
		return check(JSON.parse(text));
	} catch (error) {
		const reason = error instanceof Error ? error.message : "Could not be read";
		problems.push({ file: path, reason });
		try {
			await fs.writeText(`${path.replace(/\.json$/, "")}.damaged-${stamp()}.json`, text);
		} catch {
			/* the original is still in place; nothing was lost */
		}
		return null;
	}
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);
