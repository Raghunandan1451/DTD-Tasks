import { FC, useRef, useState } from "react";
import Button from "@src/components/ui/button/Button";
import { importBrowserBackup, type ImportReport } from "@src/features/desktop/importBrowserBackup";

/**
 * Desktop only. Brings in files downloaded from the browser version (notes,
 * boards, finance and timeline backups, or the ZIPs holding them) and says
 * exactly what was added, renamed or skipped.
 */
const ImportBackup: FC = () => {
	const input = useRef<HTMLInputElement>(null);
	const [busy, setBusy] = useState(false);
	const [report, setReport] = useState<ImportReport | null>(null);

	const choose = async (files: FileList | null) => {
		if (!files || files.length === 0) return;
		setBusy(true);
		try {
			setReport(await importBrowserBackup([...files]));
		} catch {
			setReport({ done: [], problems: ["The import failed. Nothing was changed."] });
		} finally {
			setBusy(false);
			if (input.current) input.current.value = "";
		}
	};

	return (
		<>
			<input
				ref={input}
				type="file"
				accept=".json,.zip"
				multiple
				hidden
				aria-label="Backup files to import"
				onChange={(event) => void choose(event.target.files)}
			/>
			<Button
				type="button"
				disabled={busy}
				onClick={() => input.current?.click()}
				title="Import files downloaded from the browser version"
				aria-label="Import browser backup"
				className="btn-secondary text-xs md:text-base py-1.5 md:py-2 px-2.5 md:px-4"
				text={busy ? "Importing…" : "Import"}
			/>
			{report && (
				<div
					role="dialog"
					aria-label="Import result"
					className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
				>
					<div className="max-h-full w-full max-w-md space-y-3 overflow-y-auto rounded-2xl bg-gray-800 p-5 text-sm text-gray-100 shadow-lg scrollbar-hide">
						<h2 className="text-lg font-bold">Import finished</h2>
						{report.done.length > 0 && (
							<ul className="list-disc space-y-1 pl-5">
								{report.done.map((line) => (
									<li key={line}>{line}</li>
								))}
							</ul>
						)}
						{report.problems.length > 0 && (
							<div className="space-y-1 rounded-lg bg-amber-900/50 p-3">
								<p className="font-semibold">Not imported</p>
								<ul className="list-disc space-y-1 pl-5">
									{report.problems.map((line) => (
										<li key={line}>{line}</li>
									))}
								</ul>
							</div>
						)}
						<Button
							type="button"
							onClick={() => setReport(null)}
							className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
						>
							Close
						</Button>
					</div>
				</div>
			)}
		</>
	);
};

export default ImportBackup;
