import React from "react";
import { X } from "lucide-react";
import Button from "@src/components/ui/button/Button";
import Input from "@src/components/ui/input/Input";
import { normalizeTags } from "@src/lib/db/journalValidation";

/** "#Work, home" -> ["Work", "home"]: commas split, leading # is dropped. */
const parseTags = (raw: string): string[] =>
	raw
		.split(",")
		.map((part) => part.trim().replace(/^#+/, ""))
		.filter(Boolean);

/** Folds a half-typed tag into the list, trimmed and de-duplicated. */
export const mergeTags = (tags: string[], draft: string): string[] =>
	normalizeTags([...tags, ...parseTags(draft)]);

interface TagFieldProps {
	id: string;
	tags: string[];
	draft: string;
	onTagsChange: (tags: string[]) => void;
	onDraftChange: (draft: string) => void;
	disabled?: boolean;
}

/** Tag chips plus an input: Enter or comma adds, Backspace on empty removes the last. */
const TagField: React.FC<TagFieldProps> = ({
	id,
	tags,
	draft,
	onTagsChange,
	onDraftChange,
	disabled,
}) => {
	const commit = () => {
		onTagsChange(mergeTags(tags, draft));
		onDraftChange("");
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter" || event.key === ",") {
			event.preventDefault();
			commit();
		} else if (
			event.key === "Backspace" &&
			draft === "" &&
			tags.length > 0
		) {
			onTagsChange(tags.slice(0, -1));
		}
	};

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{tags.map((tag) => (
				<span
					key={tag}
					className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 py-0.5 pl-2 pr-1 text-xs text-gray-700 dark:text-gray-300"
				>
					{tag}
					<Button
						type="button"
						aria-label={`Remove tag ${tag}`}
						disabled={disabled}
						onClick={() =>
							onTagsChange(tags.filter((entry) => entry !== tag))
						}
						className="rounded-full p-0.5 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
					>
						<X className="h-3 w-3" aria-hidden="true" />
					</Button>
				</span>
			))}
			<Input
				id={id}
				aria-label="Add a tag"
				placeholder="Add tags (press Enter)"
				value={draft}
				maxLength={30}
				disabled={disabled}
				onChange={(event) => onDraftChange(event.target.value)}
				onKeyDown={handleKeyDown}
				onBlur={() => draft.trim() && commit()}
				className="min-w-32 flex-1 rounded-md text-xs focus-visible:ring-2 focus-visible:ring-cyan-400"
			/>
		</div>
	);
};

export default TagField;
