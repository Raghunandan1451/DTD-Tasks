import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { FolderOpen } from "lucide-react";
import type { FolderProblem, FolderState } from "@src/lib/desktop/types";
import { flushPendingSaves } from "@src/lib/utils/persistMiddleware";
import { flushRegistered } from "@src/lib/utils/flushRegistry";
import { setStorage } from "@src/lib/storage";
import { createFolderTimelineStore } from "@src/lib/storage/folder/folderTimelineStore";
import { createFolderActivityStore } from "@src/lib/storage/folder/folderActivityStore";
import { createFolderFinanceStore } from "@src/lib/storage/folder/folderFinanceStore";
import { createFolderJournalStore } from "@src/lib/storage/folder/folderJournalStore";
import { createFolderBoardsStore } from "@src/lib/storage/folder/folderBoardsStore";
import { createFolderNotesStore } from "@src/lib/storage/folder/folderNotesStore";
import ImportBackup from "@src/features/desktop/ImportBackup";
import { useNotesRefreshOnFocus } from "@src/features/desktop/useNotesRefreshOnFocus";
import Button from "@src/components/ui/button/Button";

const PROBLEM_TEXT: Record<FolderProblem, string> = {
	missing: "This folder can't be found. It may have been moved, renamed or deleted, or its drive is not connected.",
	"not-a-folder": "This location is a file, not a folder.",
	"not-readable": "AIOLists isn't allowed to read this folder.",
	"not-writable": "AIOLists isn't allowed to save into this folder.",
	"newer-format": "This folder was made by a newer version of AIOLists. Update the app to open it.",
	"damaged-marker": "The folder's AIOLists settings file is damaged or missing, so it can't be trusted.",
};

const PRIMARY = "rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500";
const SECONDARY = "rounded-lg bg-gray-700 px-4 py-2 text-gray-100 hover:bg-gray-600";

const Screen: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
	<main className="flex min-h-screen items-center justify-center bg-gray-900 p-6 text-gray-100">
		<div className="w-full max-w-md space-y-4 rounded-2xl bg-gray-800 p-6 shadow-lg">
			<FolderOpen className="h-8 w-8 text-blue-400" aria-hidden />
			<h1 className="text-xl font-bold">{title}</h1>
			{children}
		</div>
	</main>
);

/**
 * Desktop only. The app does not start until it has a data folder it can read
 * and write. The page never picks the path itself: the shell opens the native
 * folder dialog and tells us what it found.
 */
const DesktopGate: FC<{ children: ReactNode }> = ({ children }) => {
	const desktop = window.desktop;
	const [state, setState] = useState<FolderState | null>(null);
	const [busy, setBusy] = useState(false);

	const run = useCallback(async (action: () => Promise<FolderState>) => {
		setBusy(true);
		try {
			setState(await action());
		} finally {
			setBusy(false);
		}
	}, []);

	useEffect(() => {
		if (desktop) void run(() => desktop.folder.getState());
	}, [desktop, run]);

	const ready = state?.status === "ready";
	const [conflicts, setConflicts] = useState<string[]>([]);
	useNotesRefreshOnFocus(ready, setConflicts);

	// Notes live in the folder. Set during render, once, so it is in place before
	// any child asks the store for the notes. Boards, journal, finance and activity are files too.
	useMemo(() => {
		if (desktop && ready) {
			const journal = createFolderJournalStore(desktop.fs);
			const activity = createFolderActivityStore(desktop.fs);
			setStorage({
				notes: createFolderNotesStore(desktop.fs),
				boards: createFolderBoardsStore(desktop.fs),
				journal,
				activity,
				finance: createFolderFinanceStore(desktop.fs),
				timeline: createFolderTimelineStore(journal, activity),
			});
		}
	}, [desktop, ready]);

	// Save everything before the window closes.
	useEffect(() => {
		if (!desktop || !ready) return;
		return desktop.onBeforeClose(async () => {
			await Promise.all([flushPendingSaves(), flushRegistered()]);
		});
	}, [desktop, ready]);

	if (!desktop) {
		return (
			<Screen title="Desktop app required">
				<p className="text-gray-300">This build needs the AIOLists desktop app to run.</p>
			</Screen>
		);
	}
	if (!state) {
		return (
			<Screen title="Opening AIOLists…">
				<p className="text-gray-300">Checking your data folder.</p>
			</Screen>
		);
	}

	if (state.status === "ready") {
		const changeFolder = async () => {
			if (!window.confirm("Switch to a different data folder? Your current folder is left untouched.")) return;
			await Promise.all([flushPendingSaves(), flushRegistered()]);
			await desktop.folder.forget();
			window.location.reload();
		};
		return (
			<>
				{children}
				<ImportBackup />
				{conflicts.length > 0 && (
					<div role="status" className="fixed bottom-12 left-2 z-50 max-w-sm space-y-1 rounded-lg bg-amber-900/90 p-3 text-xs text-amber-50 shadow-lg">
						<p>
							{conflicts.length === 1 ? "A note was" : `${conflicts.length} notes were`} changed here and on disk.
							Your text was kept in {conflicts.length === 1 ? "a copy" : "copies"} next to the note:
						</p>
						<ul className="list-disc pl-4">
							{conflicts.map((name) => (
								<li key={name}>{name}</li>
							))}
						</ul>
						<button type="button" className="underline" onClick={() => setConflicts([])}>
							Dismiss
						</button>
					</div>
				)}
				<Button
					type="button"
					onClick={changeFolder}
					title={`Data folder: ${state.path}`}
					aria-label="Change data folder"
					className="fixed bottom-2 left-2 z-50 flex items-center gap-1.5 rounded-lg bg-gray-800/80 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700"
				>
					<FolderOpen className="h-4 w-4" />
					<span className="hidden sm:inline">Change folder</span>
				</Button>
			</>
		);
	}

	if (state.status === "none") {
		return (
			<Screen title="Choose your AIOLists folder">
				<p className="text-gray-300">
					Your notes, boards and other data are saved as ordinary files in a folder you pick. Choose an empty
					folder to start fresh, or one you used before.
				</p>
				<Button type="button" disabled={busy} onClick={() => run(desktop.folder.choose)} className={PRIMARY}>
					Choose folder…
				</Button>
			</Screen>
		);
	}

	if (state.status === "needs-confirm") {
		return (
			<Screen title="This folder isn't empty">
				<p className="break-all text-sm text-gray-400">{state.path}</p>
				<p className="text-gray-300">
					It already has other files. AIOLists will only add its own files and a hidden <code>.dtdtasks</code>{" "}
					folder, and will not change or show anything else. Use it anyway?
				</p>
				<div className="flex flex-wrap gap-2">
					<Button type="button" disabled={busy} onClick={() => run(desktop.folder.confirm)} className={PRIMARY}>
						Use this folder
					</Button>
					<Button type="button" disabled={busy} onClick={() => run(desktop.folder.choose)} className={SECONDARY}>
						Choose another…
					</Button>
				</div>
			</Screen>
		);
	}

	return (
		<Screen title="Can't open your data folder">
			<p className="break-all text-sm text-gray-400">{state.path}</p>
			<p role="alert" className="text-gray-300">
				{PROBLEM_TEXT[state.problem]}
			</p>
			<div className="flex flex-wrap gap-2">
				{state.problem !== "newer-format" && (
					<Button type="button" disabled={busy} onClick={() => run(desktop.folder.retry)} className={PRIMARY}>
						Try again
					</Button>
				)}
				<Button type="button" disabled={busy} onClick={() => run(desktop.folder.choose)} className={SECONDARY}>
					Choose another folder…
				</Button>
			</div>
		</Screen>
	);
};

export default DesktopGate;
