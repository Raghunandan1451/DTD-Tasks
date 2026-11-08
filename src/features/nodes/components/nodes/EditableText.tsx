import { useState } from "react";
import { BOARD_TEXT_MAX } from "@src/lib/db/types";

interface EditableTextProps {
	value: string;
	placeholder: string;
	onCommit: (value: string) => void;
	/** Enter saves. Otherwise Enter adds a line and Ctrl/Cmd+Enter saves. */
	singleLine?: boolean;
	className?: string;
}

/** Text that turns into a textarea on double-click. Blur saves, Escape cancels. */
const EditableText: React.FC<EditableTextProps> = ({
	value,
	placeholder,
	onCommit,
	singleLine = false,
	className = "",
}) => {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value);

	const finish = () => {
		setEditing(false);
		if (draft !== value) onCommit(draft);
	};

	if (editing) {
		return (
			<textarea
				autoFocus
				value={draft}
				maxLength={BOARD_TEXT_MAX}
				rows={singleLine ? 1 : undefined}
				onChange={(event) => setDraft(event.target.value)}
				onFocus={(event) => event.target.select()}
				onBlur={finish}
				onKeyDown={(event) => {
					if (event.key === "Escape") {
						event.preventDefault();
						setEditing(false);
					} else if (event.key === "Enter" && (singleLine || event.ctrlKey || event.metaKey)) {
						event.preventDefault();
						finish();
					}
				}}
				className={`nodrag nowheel nopan w-full resize-none bg-transparent outline-none ${
					singleLine ? "" : "h-full"
				} ${className}`}
			/>
		);
	}

	return (
		<div
			onDoubleClick={(event) => {
				event.stopPropagation();
				setDraft(value);
				setEditing(true);
			}}
			className={`whitespace-pre-wrap break-words ${className}`}
		>
			{value || <span className="opacity-50">{placeholder}</span>}
		</div>
	);
};

export default EditableText;
