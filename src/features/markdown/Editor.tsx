import { ChangeEvent, FC, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft } from "lucide-react";
import { RootState } from "@src/lib/store/store";
import { updateFileContent } from "@src/lib/store/slices/markdownSlice";
import PreviewEditor from "@src/components/shared/preview_editor/PreviewEditor";
import ModeSelector, {
	EditorMode,
} from "@src/components/shared/preview_editor/ModeSelector";
import Button from "@src/components/ui/button/Button";

interface EditorProps {
	className?: string;
	/** Mobile-only: return to the file list */
	onBack?: () => void;
}

const Editor: FC<EditorProps> = ({ className = "", onBack }) => {
	const { selectedFile, content } = useSelector(
		(state: RootState) => state.fileManager,
	);
	const dispatch = useDispatch();

	const [mode, setMode] = useState<EditorMode>("preview"); // track edit/preview/split

	const handleContentChange = (
		e: string | ChangeEvent<HTMLTextAreaElement>,
	) => {
		if (!selectedFile) return;
		const value = typeof e === "string" ? e : e.target.value;
		dispatch(updateFileContent({ path: selectedFile, content: value }));
	};

	if (!selectedFile) {
		return (
			<div className={`flex-1 items-center justify-center ${className}`}>
				<p>Select a file to start editing</p>
			</div>
		);
	}

	return (
		<div
			className={`flex-1 min-w-0 p-2 bg-white/30 dark:bg-black/30 text-gray-900 dark:text-gray-100 backdrop-blur-md shadow-sm flex-col min-h-0 ${className}`}
		>
			<div className="flex items-center justify-between gap-2 mb-4">
				{onBack && (
					<Button
						type="button"
						onClick={onBack}
						aria-label="Back to files"
						className="md:hidden p-2 -ml-1 rounded-md hover:bg-gray-500/20"
					>
						<ArrowLeft className="h-5 w-5" />
					</Button>
				)}
				<h2 className="text-lg font-bold break-all min-w-0 flex-1 truncate">
					{selectedFile || "No file selected"}
				</h2>

				{/* Replace toggle button with ModeSelector */}
				<ModeSelector
					currentMode={mode}
					allowedModes={["edit", "preview", "split"]}
					onModeChange={setMode}
				/>
			</div>

			<PreviewEditor
				value={content || ""}
				onChange={handleContentChange}
				mode={mode} // controlled by parent
				placeholder="Start typing your markdown..."
				className="flex-1"
			/>
		</div>
	);
};

export default Editor;
