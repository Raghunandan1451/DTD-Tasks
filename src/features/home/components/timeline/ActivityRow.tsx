import React, { useId, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import Button from "@src/components/ui/button/Button";

interface ActivityRowProps {
	icon: React.ReactNode;
	summary: string;
	/** Dimmed, for things that no longer exist. */
	muted?: boolean;
	/** Makes a single row a link to another page. Ignored when there are children. */
	to?: string;
	/** Runs when the link is followed, before navigation (e.g. to select a file). */
	onNavigate?: () => void;
	/** When given, the row expands inline to show these <li> items. */
	children?: React.ReactNode;
}

const rowClasses =
	"glassmorphic-bg flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors duration-200 hover:bg-white/20 dark:hover:bg-white/10";
const focusClasses =
	"cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400";

const ActivityRow: React.FC<ActivityRowProps> = ({
	icon,
	summary,
	muted = false,
	to,
	onNavigate,
	children,
}) => {
	const [open, setOpen] = useState(false);
	// Items are only built once the row has been opened, so a day with thousands
	// of entries costs nothing until someone looks inside.
	const [everOpened, setEverOpened] = useState(false);
	const panelId = useId();
	const tone = muted
		? "text-gray-500 dark:text-gray-500"
		: "text-gray-800 dark:text-gray-200";

	const content = (
		<>
			<span className="shrink-0" data-tl-icon aria-hidden="true">
				{icon}
			</span>
			<span className={`min-w-0 flex-1 truncate ${tone}`} title={summary}>
				{summary}
			</span>
		</>
	);

	if (!children) {
		if (!to) return <div className={rowClasses}>{content}</div>;
		return (
			<Link
				to={to}
				onClick={onNavigate}
				className={`${rowClasses} ${focusClasses}`}
			>
				{content}
				<ChevronRight className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
			</Link>
		);
	}

	const toggle = () => {
		setEverOpened(true);
		setOpen((value) => !value);
	};

	return (
		<div>
			<Button
				type="button"
				onClick={toggle}
				aria-expanded={open}
				aria-controls={panelId}
				className={`${rowClasses} ${focusClasses}`}
			>
				{content}
				<ChevronDown
					className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
					aria-hidden="true"
				/>
			</Button>
			<div id={panelId} className="tl-collapse" data-open={open}>
				<div inert={!open}>
					<ul className="mt-1 space-y-1 pl-3">{everOpened && children}</ul>
				</div>
			</div>
		</div>
	);
};

export default ActivityRow;
