import React, { useState } from "react";
import Button from "@src/components/ui/button/Button";
import Textarea from "@src/components/ui/textbox/Textarea";
import MoodPicker from "@src/features/home/components/timeline/MoodPicker";
import TagField, {
	mergeTags,
} from "@src/features/home/components/timeline/TagField";
import { addJournalEntry } from "@src/lib/db/journalRepo";
import { JOURNAL_TEXT_MAX, type JournalMood } from "@src/lib/db/types";

interface JournalComposerProps {
	/** Called after a note is saved so the feed can reload. */
	onPosted: () => void;
	showNotification?: (
		message: string,
		type?: "info" | "error" | "success",
	) => void;
}

const messageOf = (error: unknown): string =>
	error instanceof Error ? error.message : "Could not save your note.";

const JournalComposer: React.FC<JournalComposerProps> = ({
	onPosted,
	showNotification,
}) => {
	const [text, setText] = useState("");
	const [mood, setMood] = useState<JournalMood | null>(null);
	const [tags, setTags] = useState<string[]>([]);
	const [tagDraft, setTagDraft] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const canPost = !busy && (text.trim().length > 0);

	const handlePost = async () => {
		if (!canPost) return;
		setBusy(true);
		setError(null);
		const finalTags = mergeTags(tags, tagDraft);
		try {
			await addJournalEntry({
				text,
				mood: mood ?? undefined,
				tags: finalTags,
			});
			setText("");
			setMood(null);
			setTags([]);
			setTagDraft("");
			showNotification?.("Note saved", "success");
			onPosted();
		} catch (postError) {
			setError(messageOf(postError));
		} finally {
			setBusy(false);
		}
	};

	const handleTextKeyDown = (
		event: React.KeyboardEvent<HTMLTextAreaElement>,
	) => {
		if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			void handlePost();
		}
	};

	const nearLimit = text.length >= JOURNAL_TEXT_MAX * 0.9;

	return (
		<form
			aria-label="Write a journal note"
			onSubmit={(event) => {
				event.preventDefault();
				void handlePost();
			}}
			className="glassmorphic-bg mb-4 w-full space-y-2 rounded-xl p-3 shadow-md"
		>
			<Textarea
				id="journal-text"
				aria-label="Note"
				value={text}
				onChange={(event) => setText(event.target.value)}
				onKeyDown={handleTextKeyDown}
				placeholder="What's on your mind?"
				rows={3}
				maxLength={JOURNAL_TEXT_MAX}
				autoFocus={false}
				className="w-full text-sm text-gray-800 placeholder:text-gray-500 dark:text-gray-200"
			/>

			<div className="flex flex-wrap items-center justify-between gap-2">
				<MoodPicker value={mood} onChange={setMood} disabled={busy} />
				<span
					aria-live="polite"
					className={`text-xs ${
						nearLimit
							? "text-amber-600 dark:text-amber-400"
							: "text-gray-600 dark:text-gray-400"
					}`}
				>
					{text.length}/{JOURNAL_TEXT_MAX}
				</span>
			</div>

			<TagField
				id="journal-tags"
				tags={tags}
				draft={tagDraft}
				onTagsChange={setTags}
				onDraftChange={setTagDraft}
				disabled={busy}
			/>

			{error && (
				<p role="alert" className="text-xs text-red-600 dark:text-red-400">
					{error}
				</p>
			)}

			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<p className="hidden text-xs text-gray-600 dark:text-gray-400 sm:block">
						Notes are saved for today.
					</p>
				</div>
				<Button
					type="submit"
					text={busy ? "Posting..." : "Post"}
					disabled={!canPost}
					className="btn-primary px-4 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-50"
				/>
			</div>
			<p className="text-xs text-gray-600 dark:text-gray-400 sm:hidden">
				Notes are saved for today.
			</p>
		</form>
	);
};

export default JournalComposer;
