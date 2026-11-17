import { ChangeEvent, FC } from "react";
import { Trash2 } from "lucide-react";
import { DiaryPage, formatPageDate } from "@src/features/markdown/lib/pages";
import { highlightMarkdown } from "@src/features/markdown/lib/liveMarkdown";
import { EditorMode } from "@src/components/shared/preview_editor/ModeSelector";
import MarkdownPreview from "@src/components/shared/preview_editor/MarkdownPreview";
import Button from "@src/components/ui/button/Button";

// Mirror and textarea MUST share these metrics or the caret drifts. The font is
// monospaced on purpose: the mirror shows bold, italic and headings, and in a
// proportional font those glyphs are wider than the plain ones the textarea lays
// out, so the caret ends up off the text after any formatting. In a monospaced
// font every weight and style has the same advance, so the two always line up.
export const TEXT_METRICS =
	"px-3 py-2 text-[15px] leading-7 font-mono whitespace-pre-wrap break-words";

interface EntryCardProps {
	page: DiaryPage;
	index: number;
	total: number;
	mode: EditorMode;
	onEdit: (index: number, value: string) => void;
	onDelete: (index: number) => void;
	registerTextarea: (index: number, el: HTMLTextAreaElement | null) => void;
}

/**
 * One dated entry in the scroll view. It is as tall as its text (the whole note
 * scrolls, not the card), so writing never cuts text into extra pages.
 */
const EntryCard: FC<EntryCardProps> = ({
	page,
	index,
	total,
	mode,
	onEdit,
	onDelete,
	registerTextarea,
}) => {
	const dateLabel = formatPageDate(page.date);

	const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
		onEdit(index, e.target.value);
	};

	return (
		<section className="rounded-lg border border-gray-500/30 bg-gray-500/10">
			{/* The date stays in view while a long entry scrolls by */}
			<div
				data-testid="page-date"
				className="sticky top-0 z-10 rounded-t-lg border-b border-gray-500/20 bg-gray-200/90 px-3 py-2 text-center text-sm font-semibold text-gray-500 backdrop-blur select-none dark:bg-gray-800/90 dark:text-gray-400"
			>
				{dateLabel || <span className="italic font-normal">Undated</span>}
			</div>

			{mode === "preview" ? (
				<div className="min-h-16">
					<MarkdownPreview content={page.body} enableAutoScroll={false} />
				</div>
			) : (
				<div className="relative min-h-24">
					{/* Styled mirror of the text (what you see); it sets the card's height */}
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
						className={`absolute inset-0 h-full w-full resize-none overflow-hidden bg-transparent outline-hidden text-transparent caret-blue-500 placeholder-gray-500 selection:bg-blue-500/30 ${TEXT_METRICS}`}
					/>
				</div>
			)}

			<div className="flex items-center justify-between gap-2 border-t border-gray-500/20 px-3 py-1 text-sm text-gray-500 dark:text-gray-400">
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
		</section>
	);
};

export default EntryCard;
