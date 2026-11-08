import { ChangeEvent, FC, ReactNode, useRef } from "react";
import { Trash2 } from "lucide-react";
import { DiaryPage, formatPageDate } from "@src/features/markdown/lib/pages";
import { highlightMarkdown } from "@src/features/markdown/lib/liveMarkdown";
import { EditorMode } from "@src/components/shared/preview_editor/ModeSelector";
import MarkdownPreview from "@src/components/shared/preview_editor/MarkdownPreview";
import Button from "@src/components/ui/button/Button";

// Mirror, probe and textarea MUST share these metrics or the caret drifts
// and the "does it fit" measurement lies. The font is monospaced on purpose:
// the mirror shows bold, italic and headings, and in a proportional font those
// glyphs are wider than the plain ones the textarea lays out, so the caret ends
// up off the text after any formatting. In a monospaced font every weight and
// style has the same advance, so the two always line up.
export const TEXT_METRICS =
	"px-3 py-2 text-[15px] leading-7 font-mono whitespace-pre-wrap break-words";

interface PageCardProps {
	/** null renders an empty sheet (second slot of the last spread). */
	page: DiaryPage | null;
	index: number;
	total: number;
	mode: EditorMode;
	onEdit: (
		index: number,
		value: string,
		caret: number,
		fits: (s: string) => boolean,
	) => void;
	onDelete: (index: number) => void;
	registerTextarea: (index: number, el: HTMLTextAreaElement | null) => void;
	/** Page-turn buttons live in the date row, on either side of the date. */
	leftSlot?: ReactNode;
	rightSlot?: ReactNode;
}

const PageCard: FC<PageCardProps> = ({
	page,
	index,
	total,
	mode,
	onEdit,
	onDelete,
	registerTextarea,
	leftSlot,
	rightSlot,
}) => {
	const bodyRef = useRef<HTMLDivElement>(null);
	const probeRef = useRef<HTMLDivElement>(null);

	// Does `text` fit on this page without scrolling? Measured, not guessed.
	const fits = (text: string): boolean => {
		const probe = probeRef.current;
		const body = bodyRef.current;
		if (!probe || !body) return true;
		probe.textContent = `${text}\n`;
		return probe.offsetHeight <= body.clientHeight;
	};

	const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
		onEdit(index, e.target.value, e.target.selectionStart, fits);
	};

	const dateLabel = page ? formatPageDate(page.date) : "";

	return (
		<div className="flex flex-col flex-1 min-w-0 min-h-0 rounded-lg border border-gray-500/30 bg-gray-500/10">
			{/* Date row: arrows sit level with the read-only date */}
			<div className="flex items-center gap-1 px-1 py-1 border-b border-gray-500/20 min-h-10">
				<div className="w-10 shrink-0 flex justify-start">{leftSlot}</div>
				<div
					data-testid="page-date"
					className="flex-1 min-w-0 text-center text-sm font-semibold truncate text-gray-500 dark:text-gray-400 select-none"
				>
					{page &&
						(dateLabel || <span className="italic font-normal">Undated</span>)}
				</div>
				<div className="w-10 shrink-0 flex justify-end">{rightSlot}</div>
			</div>

			<div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
				{page &&
					(mode === "preview" ? (
						<MarkdownPreview content={page.body} enableAutoScroll={false} />
					) : (
						<div className="relative min-h-full">
							{/* Invisible twin used only to measure what fits */}
							<div
								ref={probeRef}
								aria-hidden
								className={`absolute left-0 right-0 top-0 invisible pointer-events-none ${TEXT_METRICS}`}
							/>
							{/* Styled mirror of the text (what you see) */}
							<div aria-hidden className={`pointer-events-none ${TEXT_METRICS}`}>
								{highlightMarkdown(page.body)}
								{/* Keeps a trailing newline visible so heights match */}
								{"\n"}
							</div>
							{/* Real input on top: invisible text, visible caret */}
							<textarea
								ref={(el) => registerTextarea(index, el)}
								value={page.body}
								onChange={handleChange}
								placeholder="Write on this page..."
								aria-label="Page text"
								spellCheck
								rows={1}
								className={`absolute inset-0 w-full h-full resize-none overflow-hidden bg-transparent outline-hidden text-transparent caret-blue-500 placeholder-gray-500 selection:bg-blue-500/30 ${TEXT_METRICS}`}
							/>
						</div>
					))}
			</div>

			{page && (
				<div className="flex items-center justify-between gap-2 px-3 py-1 border-t border-gray-500/20 text-sm text-gray-500 dark:text-gray-400">
					<span className="w-8">
						{mode === "edit" && total > 1 && (
							<Button
								type="button"
								onClick={() => onDelete(index)}
								aria-label="Delete page"
								title="Delete page"
								className="p-1 rounded hover:bg-red-500/20 hover:text-red-500"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						)}
					</span>
					<span data-testid="page-counter">
						Page {index + 1} of {total}
					</span>
					<span className="w-8" />
				</div>
			)}
		</div>
	);
};

export default PageCard;
