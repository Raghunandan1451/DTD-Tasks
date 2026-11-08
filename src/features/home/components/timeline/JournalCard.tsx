import React, { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import Button from "@src/components/ui/button/Button";
import Textarea from "@src/components/ui/textbox/Textarea";
import JournalImage from "@src/features/home/components/timeline/JournalImage";
import MoodPicker from "@src/features/home/components/timeline/MoodPicker";
import TagField, {
	mergeTags,
} from "@src/features/home/components/timeline/TagField";
import { MOODS } from "@src/features/home/lib/moods";
import { useTimelineActions } from "@src/features/home/lib/timelineActions";
import type { JournalTimelineItem } from "@src/features/home/lib/timelineTypes";
import { JOURNAL_TEXT_MAX, type JournalMood } from "@src/lib/db/types";

const timeOf = (timestamp: number): string =>
	new Date(timestamp).toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
	});

const iconButton =
	"rounded-md p-1 text-gray-600 hover:bg-white/20 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-100";

interface JournalCardProps {
	item: JournalTimelineItem;
}

const JournalCard: React.FC<JournalCardProps> = ({ item }) => {
	const { entry } = item;
	const actions = useTimelineActions();

	// Right after Save the feed has not reloaded yet. Show what was just saved
	// (tied to the version it was based on) instead of flashing the old text.
	const [saved, setSaved] = useState<{
		basedOn: number | undefined;
		text: string;
		mood: JournalMood | null;
		tags: string[];
	} | null>(null);
	const shown =
		saved && saved.basedOn === entry.updatedAt
			? saved
			: {
					text: entry.text,
					mood: entry.mood ?? null,
					tags: entry.tags ?? [],
				};
	const mood = shown.mood ? MOODS[shown.mood] : null;

	const [editing, setEditing] = useState(false);
	const [text, setText] = useState(entry.text);
	const [editMood, setEditMood] = useState<JournalMood | null>(
		entry.mood ?? null,
	);
	const [tags, setTags] = useState<string[]>(entry.tags ?? []);
	const [tagDraft, setTagDraft] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const startEditing = () => {
		setText(shown.text);
		setEditMood(shown.mood);
		setTags(shown.tags);
		setTagDraft("");
		setError(null);
		setEditing(true);
	};

	const cancel = () => {
		setEditing(false);
		setError(null);
	};

	const save = async () => {
		if (busy) return;
		setBusy(true);
		setError(null);
		try {
			// Only text, mood and tags can change; the date and image never do.
			const nextTags = mergeTags(tags, tagDraft);
			await actions.saveNote(entry.id, {
				text,
				mood: editMood,
				tags: nextTags,
			});
			setSaved({
				basedOn: entry.updatedAt,
				text: text.trim(),
				mood: editMood,
				tags: nextTags,
			});
			setEditing(false);
		} catch (saveError) {
			setError(
				saveError instanceof Error
					? saveError.message
					: "Could not save your changes.",
			);
		} finally {
			setBusy(false);
		}
	};

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === "Escape") {
			event.stopPropagation();
			cancel();
		} else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			void save();
		}
	};

	return (
		<article className="glassmorphic-bg rounded-xl p-3 shadow-md transition-colors duration-200 hover:bg-white/20 dark:hover:bg-white/10 focus-within:ring-2 focus-within:ring-cyan-400">
			<header className="mb-1 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
				<time dateTime={new Date(entry.createdAt).toISOString()}>
					{timeOf(entry.createdAt)}
				</time>
				{mood && !editing && (
					<span role="img" aria-label={mood.label} title={mood.label}>
						{mood.emoji}
					</span>
				)}
				{entry.updatedAt && !editing && (
					<span title={`Edited ${timeOf(entry.updatedAt)}`}>
						(edited)
					</span>
				)}
				{!editing && (
					<span className="ml-auto flex items-center gap-0.5">
						<Button
							type="button"
							aria-label="Edit note"
							title="Edit note"
							onClick={startEditing}
							className={iconButton}
						>
							<Pencil
								className="h-3.5 w-3.5"
								aria-hidden="true"
							/>
						</Button>
						<Button
							type="button"
							aria-label="Delete note"
							title="Delete note"
							onClick={() => void actions.deleteNote(entry.id)}
							className={iconButton}
						>
							<Trash2
								className="h-3.5 w-3.5"
								aria-hidden="true"
							/>
						</Button>
					</span>
				)}
			</header>

			{editing ? (
				<form
					aria-label="Edit note"
					onKeyDown={handleKeyDown}
					onSubmit={(event) => {
						event.preventDefault();
						void save();
					}}
					className="space-y-2"
				>
					<Textarea
						aria-label="Note text"
						value={text}
						onChange={(event) => setText(event.target.value)}
						rows={3}
						maxLength={JOURNAL_TEXT_MAX}
						className="w-full text-sm text-gray-800 dark:text-gray-200"
					/>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<MoodPicker
							value={editMood}
							onChange={setEditMood}
							disabled={busy}
						/>
						<span className="text-xs text-gray-600 dark:text-gray-400">
							{text.length}/{JOURNAL_TEXT_MAX}
						</span>
					</div>
					<TagField
						id={`edit-tags-${entry.id}`}
						tags={tags}
						draft={tagDraft}
						onTagsChange={setTags}
						onDraftChange={setTagDraft}
						disabled={busy}
					/>
					{error && (
						<p
							role="alert"
							className="text-xs text-red-600 dark:text-red-400"
						>
							{error}
						</p>
					)}
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							text="Cancel"
							onClick={cancel}
							disabled={busy}
							className="rounded-lg px-3 py-1 text-sm text-gray-700 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:text-gray-300 dark:hover:bg-white/10"
						/>
						<Button
							type="submit"
							text={busy ? "Saving..." : "Save"}
							disabled={busy || (!text.trim() && !entry.imageId)}
							className="btn-primary px-3 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-50"
						/>
					</div>
				</form>
			) : (
				shown.text && (
					<p className="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200">
						{shown.text}
					</p>
				)
			)}

			{entry.imageId && <JournalImage imageId={entry.imageId} />}

			{!editing && shown.tags.length > 0 && (
				<ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Tags">
					{shown.tags.map((tag) => (
						<li
							key={tag}
							className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300"
						>
							{tag}
						</li>
					))}
				</ul>
			)}
		</article>
	);
};

export default JournalCard;
