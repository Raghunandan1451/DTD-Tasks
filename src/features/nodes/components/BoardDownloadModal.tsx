import { useState } from "react";
import Button from "@src/components/ui/button/Button";
import { ModalLayout } from "@src/components/shared/dialog/ModalLayout";
import type { ImageFormat } from "@src/features/nodes/lib/boardExport";

export type BoardDownloadScope = "current" | "all";

interface BoardDownloadModalProps {
	/** Name of the open board, if any. */
	activeName?: string;
	boardCount: number;
	/** Selected nodes on the open board. */
	selectedCount: number;
	busy: boolean;
	onDownload: (scope: BoardDownloadScope, format: ImageFormat) => void;
	onClose: () => void;
}

const FORMATS: { value: ImageFormat; label: string; hint: string }[] = [
	{ value: "png", label: "PNG", hint: "Sharp, larger files" },
	{ value: "jpg", label: "JPG", hint: "Smaller files" },
];

const OPTION =
	"rounded-lg border px-3 py-2 text-left text-sm text-gray-800 dark:text-gray-100 bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 disabled:opacity-40 disabled:pointer-events-none";
const CHOSEN = "ring-2 ring-cyan-400";

const Choice: React.FC<{
	checked: boolean;
	onSelect: () => void;
	label: string;
	hint?: string;
	disabled?: boolean;
}> = ({ checked, onSelect, label, hint, disabled }) => (
	<Button
		aria-pressed={checked}
		disabled={disabled}
		onClick={onSelect}
		className={`${OPTION} ${checked ? CHOSEN : ""}`}
	>
		<span className="block font-medium">{label}</span>
		{hint && <span className="block text-xs text-gray-600 dark:text-gray-300">{hint}</span>}
	</Button>
);

/** Asks which boards to download and which picture type to include. */
const BoardDownloadModal: React.FC<BoardDownloadModalProps> = ({
	activeName,
	boardCount,
	selectedCount,
	busy,
	onDownload,
	onClose,
}) => {
	const hasActive = activeName !== undefined;
	const [scope, setScope] = useState<BoardDownloadScope>(hasActive ? "current" : "all");
	const [format, setFormat] = useState<ImageFormat>("png");

	const imageNote =
		scope === "current"
			? selectedCount > 0
				? `Images include only the ${selectedCount} selected ${selectedCount === 1 ? "item" : "items"}.`
				: "Nothing is selected, so the image shows the whole board."
			: "Every board gets an image. Boards with no nodes are skipped.";

	return (
		<ModalLayout
			title="Download boards"
			onClose={onClose}
			maxWidth="max-w-md"
			footer={
				<div className="flex justify-end gap-2">
					<Button className={OPTION} onClick={onClose} disabled={busy}>
						Cancel
					</Button>
					<Button
						className={`${OPTION} btn-primary`}
						onClick={() => onDownload(scope, format)}
						disabled={busy || boardCount === 0}
					>
						{busy ? "Downloading…" : "Download"}
					</Button>
				</div>
			}
		>
			<div className="space-y-4">
				<div>
					<p className="mb-2 text-sm font-medium text-gray-800 dark:text-gray-100">Which boards?</p>
					<div role="group" aria-label="Which boards" className="grid grid-cols-2 gap-2">
						<Choice
							checked={scope === "current"}
							onSelect={() => setScope("current")}
							label="Current board"
							hint={hasActive ? activeName : "No board is open"}
							disabled={!hasActive}
						/>
						<Choice
							checked={scope === "all"}
							onSelect={() => setScope("all")}
							label="All boards"
							hint={`${boardCount} ${boardCount === 1 ? "board" : "boards"}`}
						/>
					</div>
				</div>

				<div>
					<p className="mb-2 text-sm font-medium text-gray-800 dark:text-gray-100">Image type</p>
					<div role="group" aria-label="Image type" className="grid grid-cols-2 gap-2">
						{FORMATS.map((item) => (
							<Choice
								key={item.value}
								checked={format === item.value}
								onSelect={() => setFormat(item.value)}
								label={item.label}
								hint={item.hint}
							/>
						))}
					</div>
				</div>

				<p className="text-sm text-gray-700 dark:text-gray-300">
					Downloads as a ZIP with the JSON backup and an image of each board. {imageNote}
				</p>
			</div>
		</ModalLayout>
	);
};

export default BoardDownloadModal;
