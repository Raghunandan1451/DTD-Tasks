import React from "react";
import { Link } from "react-router-dom";
import {
	FilePen,
	FilePlus,
	FileText,
	FileX,
	FolderPen,
	FolderPlus,
	FolderX,
	FolderOpen,
	Receipt,
} from "lucide-react";
import ActivityRow from "@src/features/home/components/timeline/ActivityRow";
import JournalCard from "@src/features/home/components/timeline/JournalCard";
import {
	describeExpenses,
	describeFiles,
	formatINR,
	type TimelineEntry,
} from "@src/features/home/lib/timelineLayout";
import { useTimelineActions } from "@src/features/home/lib/timelineActions";
import type { MarkdownAction } from "@src/lib/db/types";

const FILE_ICONS: Record<MarkdownAction, typeof FileText> = {
	created: FilePlus,
	edited: FileText,
	renamed: FilePen,
	deleted: FileX,
};

const FOLDER_ICONS: Record<MarkdownAction, typeof FolderOpen> = {
	created: FolderPlus,
	edited: FolderOpen,
	renamed: FolderPen,
	deleted: FolderX,
};

const iconFor = (action: MarkdownAction, isFolder: boolean) => {
	const Icon = (isFolder ? FOLDER_ICONS : FILE_ICONS)[action];
	return <Icon className="h-4 w-4" />;
};

const listItemClasses = "rounded-md px-2 py-1 text-xs";
const linkClasses = `${listItemClasses} block truncate text-cyan-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:text-cyan-300`;

interface TimelineEntryRowProps {
	entry: TimelineEntry;
}

const TimelineEntryRow: React.FC<TimelineEntryRowProps> = ({ entry }) => {
	const actions = useTimelineActions();

	if (entry.type === "journal") return <JournalCard item={entry.item} />;

	if (entry.type === "files") {
		const isFolder = entry.items.every((item) => item.entry.meta?.isFolder);
		const summary = describeFiles(entry.action, entry.items);
		const muted = entry.action === "deleted";
		const icon = iconFor(entry.action, isFolder);

		if (entry.items.length === 1) {
			const [item] = entry.items;
			// Only things that still exist can be opened; deleted ones stay plain text.
			return (
				<ActivityRow
					icon={icon}
					summary={summary}
					muted={muted}
					to={item.isLive ? "/notes" : undefined}
					onNavigate={() => actions.openFile(item.entry.fileId)}
				/>
			);
		}
		return (
			<ActivityRow icon={icon} summary={summary} muted={muted}>
				{entry.items.map((item) => {
					const label =
						item.entry.action === "renamed" && item.entry.meta?.oldName
							? `${item.entry.meta.oldName} → ${item.entry.name}`
							: item.entry.name;
					return (
						<li key={item.id} title={item.entry.name}>
							{item.isLive ? (
								<Link
									to="/notes"
									onClick={() => actions.openFile(item.entry.fileId)}
									className={linkClasses}
								>
									{label}
								</Link>
							) : (
								<span
									className={`${listItemClasses} block truncate text-gray-500 line-through dark:text-gray-500`}
								>
									{label}
								</span>
							)}
						</li>
					);
				})}
			</ActivityRow>
		);
	}

	const icon = <Receipt className="h-4 w-4" />;
	const day = entry.items[0].entry.date;
	if (entry.items.length === 1) {
		const { entry: expense } = entry.items[0];
		const verb = expense.type === "Cr" ? "Received" : "Spent";
		return (
			<ActivityRow
				icon={icon}
				summary={`${expense.name} · ${verb} ${formatINR(expense.amount)}`}
				to="/expenses"
				onNavigate={() => actions.openExpenses(day)}
			/>
		);
	}

	return (
		<ActivityRow icon={icon} summary={describeExpenses(entry.totals)}>
			{entry.items.map((item) => {
				const credit = item.entry.type === "Cr";
				return (
					<li
						key={item.id}
						className={`${listItemClasses} flex items-baseline justify-between gap-3 text-gray-700 dark:text-gray-300`}
					>
						<span className="min-w-0 flex-1 truncate" title={item.entry.name}>
							{item.entry.name}
							<span className="ml-1 text-gray-500">· {item.entry.group}</span>
						</span>
						<span
							className={
								credit
									? "shrink-0 font-medium text-emerald-600 dark:text-emerald-400"
									: "shrink-0 font-medium"
							}
						>
							{credit ? "+" : "−"}
							{formatINR(item.entry.amount)}
						</span>
					</li>
				);
			})}
			<li>
				<Link
					to="/expenses"
					onClick={() => actions.openExpenses(day)}
					className={linkClasses}
				>
					Open this day in Expenses
				</Link>
			</li>
		</ActivityRow>
	);
};

export default TimelineEntryRow;
