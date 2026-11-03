import type { JournalMood } from "@src/lib/db/types";

export const MOODS: Record<JournalMood, { emoji: string; label: string }> = {
	1: { emoji: "😞", label: "Very low mood" },
	2: { emoji: "🙁", label: "Low mood" },
	3: { emoji: "😐", label: "Neutral mood" },
	4: { emoji: "🙂", label: "Good mood" },
	5: { emoji: "😄", label: "Great mood" },
};

export const MOOD_VALUES: JournalMood[] = [1, 2, 3, 4, 5];
