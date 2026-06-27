import Input from "@src/components/ui/input/Input";
import React, { useRef } from "react";

interface CreateFileFolderProps {
	setShowInput: (value: boolean) => void;
	newFilePath: string;
	setNewFilePath: (path: string) => void;
	onCreate: () => void;
}

const CreateFileFolder: React.FC<CreateFileFolderProps> = ({
	setShowInput,
	newFilePath,
	setNewFilePath,
	onCreate,
}) => {
	const hasFocused = useRef(false);

	return (
		<div className="flex items-center p-1">
			<Input
				id="md-input-create"
				inputRef={(el) => {
					if (el && !hasFocused.current) {
						hasFocused.current = true;
						el.focus();
					}
				}}
				className="text-sm"
				value={newFilePath}
				onChange={(e) => setNewFilePath(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") onCreate();
					if (e.key === "Escape") {
						setShowInput(false);
						setNewFilePath("");
					}
				}}
				onBlur={() => {
					if (!newFilePath) setShowInput(false);
				}}
				placeholder="folder/file.md"
			/>
		</div>
	);
};

export default CreateFileFolder;
