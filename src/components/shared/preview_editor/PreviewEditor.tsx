import { useRef, useCallback } from "react";
import Textarea from "@src/components/ui/textbox/Textarea";
import MarkdownPreview from "@src/components/shared/preview_editor/MarkdownPreview";
import { EditorMode } from "@src/components/shared/preview_editor/ModeSelector";

interface PreviewEditorProps {
	value: string;
	onChange?: (e: React.ChangeEvent<HTMLTextAreaElement> | string) => void;
	mode: EditorMode;
	placeholder?: string;
	className?: string;
}

const PreviewEditor = ({
	value,
	onChange,
	mode,
	placeholder = "Type your markdown here...",
	className = "",
}: PreviewEditorProps) => {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const previewRef = useRef<HTMLDivElement>(null);
	const syncingRef = useRef<"textarea" | "preview" | null>(null);

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		onChange?.(e.target.value);
	};

	const handleTextareaScroll = useCallback(() => {
		if (
			!textareaRef.current ||
			!previewRef.current ||
			syncingRef.current === "preview"
		)
			return;

		syncingRef.current = "textarea";
		const textarea = textareaRef.current;
		const preview = previewRef.current;

		const maxScroll = textarea.scrollHeight - textarea.clientHeight;
		if (maxScroll <= 0) return;

		const scrollPercentage = textarea.scrollTop / maxScroll;
		const previewMaxScroll = preview.scrollHeight - preview.clientHeight;
		preview.scrollTop = scrollPercentage * previewMaxScroll;

		setTimeout(() => {
			syncingRef.current = null;
		}, 50);
	}, []);

	const handlePreviewScroll = useCallback(() => {
		if (
			!textareaRef.current ||
			!previewRef.current ||
			syncingRef.current === "textarea"
		)
			return;

		syncingRef.current = "preview";
		const textarea = textareaRef.current;
		const preview = previewRef.current;

		const maxScroll = preview.scrollHeight - preview.clientHeight;
		if (maxScroll <= 0) return;

		const scrollPercentage = preview.scrollTop / maxScroll;
		const textareaMaxScroll = textarea.scrollHeight - textarea.clientHeight;
		textarea.scrollTop = scrollPercentage * textareaMaxScroll;

		setTimeout(() => {
			syncingRef.current = null;
		}, 50);
	}, []);

	return (
		<div className={`flex flex-col h-full overflow-hidden ${className}`}>
			{mode === "edit" && (
				<Textarea
					textareaRef={textareaRef}
					className="bg-transparent outline-none resize-none w-full h-full text-gray-900 dark:text-gray-100 placeholder-gray-700 dark:placeholder-gray-500 p-2 scrollbar-hide overflow-y-auto"
					value={value}
					onChange={handleChange}
					placeholder={placeholder}
				/>
			)}

			{mode === "preview" && (
				<MarkdownPreview content={value} enableAutoScroll={false} />
			)}

			{/* VERTICAL SPLIT: Preview on top (flex-2), Editor on bottom (3 rows) */}
			{mode === "split" && (
				<div className="flex flex-col h-full overflow-hidden">
					{/* Preview - Top (2/3 of space) */}
					<div className="flex-[2] min-h-0 overflow-hidden">
						<MarkdownPreview
							content={value}
							containerRef={previewRef}
							onScroll={handlePreviewScroll}
							enableAutoScroll={false}
						/>
					</div>

					{/* Divider */}
					<div className="h-px bg-gray-500/30 my-2" />

					{/* Editor - Bottom (Fixed 3 rows ≈ 6rem) */}
					<div
						className="flex-shrink-0 overflow-hidden"
						style={{ height: "6rem" }}
					>
						<Textarea
							textareaRef={textareaRef}
							value={value}
							onChange={handleChange}
							onScroll={handleTextareaScroll}
							placeholder={placeholder}
							rows={3}
							className="bg-transparent outline-none resize-none w-full h-full text-gray-900 dark:text-gray-100 placeholder-gray-700 dark:placeholder-gray-500 p-2 scrollbar-hide overflow-y-auto"
						/>
					</div>
				</div>
			)}
		</div>
	);
};

export default PreviewEditor;
