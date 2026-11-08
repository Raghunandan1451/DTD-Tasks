import React from "react";
import { MOODS } from "@src/features/home/lib/moods";
import type { JournalEntry } from "@src/lib/db/types";

interface OnThisDayCardProps {
	entries: JournalEntry[];
	/** Injected for tests; defaults to the current year. */
	currentYear?: number;
}

const yearsAgo = (years: number): string =>
	years === 1 ? "1 year ago" : `${years} years ago`;

/** Notes from this calendar date in earlier years. Renders nothing when there are none. */
const OnThisDayCard: React.FC<OnThisDayCardProps> = ({
	entries,
	currentYear = new Date().getFullYear(),
}) => {
	if (entries.length === 0) return null;

	return (
		<section
			aria-label="On this day"
			className="glassmorphic-bg mb-4 w-full rounded-xl p-3 shadow-md"
		>
			<h2 className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
				On this day
			</h2>
			<ul className="space-y-2">
				{entries.map((entry) => {
					const year = new Date(entry.createdAt).getFullYear();
					const mood = entry.mood ? MOODS[entry.mood] : null;
					return (
						<li key={entry.id} className="text-sm">
							<p className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
								<span>
									{year} · {yearsAgo(currentYear - year)}
								</span>
								{mood && (
									<span role="img" aria-label={mood.label} title={mood.label}>
										{mood.emoji}
									</span>
								)}
							</p>
							{entry.text && (
								<p className="line-clamp-3 whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
									{entry.text}
								</p>
							)}
						</li>
					);
				})}
			</ul>
		</section>
	);
};

export default OnThisDayCard;
