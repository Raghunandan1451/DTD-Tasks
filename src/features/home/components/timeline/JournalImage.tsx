import React, { useEffect, useState } from "react";
import { getJournalImage } from "@src/lib/db/journalImagesRepo";

interface JournalImageProps {
	imageId: string;
}

/** Loads a note's stored image and shows it; renders nothing if it is gone. */
const JournalImage: React.FC<JournalImageProps> = ({ imageId }) => {
	const [url, setUrl] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		let objectUrl: string | null = null;
		getJournalImage(imageId)
			.then((blob) => {
				if (cancelled || !blob) return;
				objectUrl = URL.createObjectURL(blob);
				setUrl(objectUrl);
			})
			.catch((error: unknown) => {
				console.warn("[journal] Could not load image", error);
			});
		return () => {
			cancelled = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [imageId]);

	if (!url) return null;
	return (
		<img
			src={url}
			alt="Attached to this note"
			loading="lazy"
			className="mt-2 max-h-64 w-full rounded-lg object-cover"
		/>
	);
};

export default JournalImage;
