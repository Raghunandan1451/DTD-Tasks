import React from "react";
import Button from "@src/components/ui/button/Button";
import type { TimelineFilter } from "@src/features/home/lib/timelineTypes";

const bar = "rounded bg-gray-400/30 dark:bg-gray-500/30 animate-pulse motion-reduce:animate-none";

/** Placeholder days drawn on the real path so the layout does not jump. */
export const TimelineSkeleton: React.FC = () => (
	<ol aria-hidden="true" data-testid="timeline-skeleton">
		{[0, 1, 2].map((index) => (
			<li key={index} className="tl-day">
				<div className="tl-day-head">
					<span className="tl-node" />
					<div className={`h-4 w-32 ${bar}`} />
				</div>
				<ul>
					{[0, 1].map((rowIndex) => (
						<li key={rowIndex} className="tl-row">
							<div className={`h-9 w-full max-w-sm rounded-lg ${bar}`} />
						</li>
					))}
				</ul>
			</li>
		))}
		<span className="sr-only">Loading your timeline</span>
	</ol>
);

const EMPTY_COPY: Record<TimelineFilter, { title: string; text: string }> = {
	all: {
		title: "Write your first note",
		text: "Journal notes, expenses and file activity will show up here as you use the app.",
	},
	journal: {
		title: "No notes yet",
		text: "Notes you write above will show up here.",
	},
	expenses: {
		title: "No expenses yet",
		text: "Expenses you add on the Expenses page show up under their own date.",
	},
	files: {
		title: "No file activity yet",
		text: "Creating, editing, renaming or deleting Markdown files shows up here.",
	},
};

interface TimelineEmptyProps {
	filter?: TimelineFilter;
}

export const TimelineEmpty: React.FC<TimelineEmptyProps> = ({
	filter = "all",
}) => (
	<div className="glassmorphic-bg mx-auto mt-4 max-w-md rounded-xl p-6 text-center shadow-md">
		<h2 className="mb-1 text-xl font-semibold text-gray-800 dark:text-gray-200">
			{EMPTY_COPY[filter].title}
		</h2>
		<p className="text-sm text-gray-600 dark:text-gray-400">
			{EMPTY_COPY[filter].text}
		</p>
	</div>
);

interface TimelineErrorProps {
	onRetry: () => void;
}

export const TimelineError: React.FC<TimelineErrorProps> = ({ onRetry }) => (
	<div
		role="alert"
		className="glassmorphic-bg mx-auto mt-4 flex max-w-md flex-col items-center gap-3 rounded-xl p-6 text-center shadow-md"
	>
		<p className="text-sm text-gray-800 dark:text-gray-200">
			We couldn&apos;t load your timeline.
		</p>
		<Button
			type="button"
			onClick={onRetry}
			text="Try again"
			className="btn-primary px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
		/>
	</div>
);
