import React from "react";
import PreviewEditor from "@src/components/shared/preview_editor/PreviewEditor";
import { EditorMode } from "@src/components/shared/preview_editor/ModeSelector";

interface ContentSectionProps {
	content: string;
	editContent: string;
	isEditing: boolean;
	onContentChange: (content: string) => void;
}

export const ContentSection: React.FC<ContentSectionProps> = ({
	content,
	editContent,
	isEditing,
	onContentChange,
}) => {
	// Automatically determine mode based on isEditing state
	const mode: EditorMode = isEditing ? "edit" : "preview";

	const handleContentChange = (
		e: React.ChangeEvent<HTMLTextAreaElement> | string
	) => {
		const value = typeof e === "string" ? e : e.target.value;
		onContentChange(value);
	};

	return (
		<div className="mt-4">
			<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
				Content
			</h3>

			{/* Fixed height container for PreviewEditor */}
			<div
				className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50/20 dark:bg-gray-700/20"
				style={{ height: isEditing ? "300px" : "200px" }}
			>
				<PreviewEditor
					value={isEditing ? editContent : content}
					onChange={handleContentChange}
					mode={mode}
					placeholder="Enter event content in markdown..."
					className="h-full"
				/>
			</div>
		</div>
	);
};
