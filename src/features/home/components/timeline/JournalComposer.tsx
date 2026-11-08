import React, { useEffect, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import Button from "@src/components/ui/button/Button";
import Input from "@src/components/ui/input/Input";
import { useFilePicker } from "@src/lib/hooks/useFilePicker";
import Textarea from "@src/components/ui/textbox/Textarea";
import MoodPicker from "@src/features/home/components/timeline/MoodPicker";
import TagField, {
	mergeTags,
} from "@src/features/home/components/timeline/TagField";
import {
	deleteJournalImage,
	putJournalImage,
} from "@src/lib/db/journalImagesRepo";
import { addJournalEntry } from "@src/lib/db/journalRepo";
import { JOURNAL_TEXT_MAX, type JournalMood } from "@src/lib/db/types";
import { resizeImageToJpeg } from "@src/lib/utils/imageResize";

interface JournalComposerProps {
	/** Called after a note is saved so the feed can reload. */
	onPosted: () => void;
	showNotification?: (
		message: string,
		type?: "info" | "error" | "success",
	) => void;
}

interface AttachedImage {
	blob: Blob;
	previewUrl: string;
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
	const [image, setImage] = useState<AttachedImage | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { open, inputProps } = useFilePicker({
		accept: "image/*",
		onFiles: (files) => handleAttach(files),
	});

	// Free the preview's object URL when it is replaced or the composer unmounts.
	useEffect(() => {
		const url = image?.previewUrl;
		return () => {
			if (url) URL.revokeObjectURL(url);
		};
	}, [image]);

	const handleAttach = async ([file]: File[]) => {
		setError(null);
		try {
			const blob = await resizeImageToJpeg(file);
			setImage({ blob, previewUrl: URL.createObjectURL(blob) });
		} catch (attachError) {
			setError(messageOf(attachError));
		}
	};

	const canPost = !busy && (text.trim().length > 0 || image !== null);

	const handlePost = async () => {
		if (!canPost) return;
		setBusy(true);
		setError(null);
		const finalTags = mergeTags(tags, tagDraft);
		let imageId: string | undefined;
		try {
			if (image) imageId = await putJournalImage(image.blob);
			await addJournalEntry({
				text,
				mood: mood ?? undefined,
				tags: finalTags,
				imageId,
			});
			setText("");
			setMood(null);
			setTags([]);
			setTagDraft("");
			setImage(null);
			showNotification?.("Note saved", "success");
			onPosted();
		} catch (postError) {
			// Do not leave an orphaned image behind when the note was not saved.
			if (imageId) deleteJournalImage(imageId).catch(() => undefined);
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

			{image && (
				<div className="relative w-fit">
					<img
						src={image.previewUrl}
						alt="Selected attachment"
						className="max-h-32 rounded-lg object-cover"
					/>
					<Button
						type="button"
						aria-label="Remove image"
						onClick={() => setImage(null)}
						className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
					>
						<X className="h-3.5 w-3.5" aria-hidden="true" />
					</Button>
				</div>
			)}

			{error && (
				<p role="alert" className="text-xs text-red-600 dark:text-red-400">
					{error}
				</p>
			)}

			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<Button
						type="button"
						onClick={open}
						disabled={busy}
						className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-700 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:text-gray-300 dark:hover:bg-white/10"
					>
						<ImagePlus className="h-4 w-4" aria-hidden="true" />
						<span>Add image</span>
					</Button>
					<Input
						id="journalImage"
						aria-label="Attach an image"
						{...inputProps}
					/>
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
