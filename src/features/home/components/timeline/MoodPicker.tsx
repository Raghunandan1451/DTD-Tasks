import React from "react";
import Button from "@src/components/ui/button/Button";
import { MOODS, MOOD_VALUES } from "@src/features/home/lib/moods";
import type { JournalMood } from "@src/lib/db/types";

interface MoodPickerProps {
	value: JournalMood | null;
	onChange: (mood: JournalMood | null) => void;
	disabled?: boolean;
}

/** Five mood buttons; pressing the selected one clears it. */
const MoodPicker: React.FC<MoodPickerProps> = ({ value, onChange, disabled }) => (
	<div role="group" aria-label="Mood" className="flex gap-1">
		{MOOD_VALUES.map((mood) => {
			const selected = value === mood;
			return (
				<Button
					key={mood}
					type="button"
					aria-pressed={selected}
					title={MOODS[mood].label}
					disabled={disabled}
					onClick={() => onChange(selected ? null : mood)}
					className={`rounded-lg px-1.5 py-0.5 text-lg leading-none transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
						selected
							? "bg-white/30 ring-2 ring-cyan-400 dark:bg-white/20"
							: "opacity-60 hover:bg-white/20 hover:opacity-100 dark:hover:bg-white/10"
					}`}
				>
					<span role="img" aria-label={MOODS[mood].label}>
						{MOODS[mood].emoji}
					</span>
				</Button>
			);
		})}
	</div>
);

export default MoodPicker;
