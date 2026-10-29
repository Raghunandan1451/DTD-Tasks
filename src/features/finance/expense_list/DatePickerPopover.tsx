import { FC, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import {
	addDays,
	addMonths,
	addYears,
	format,
	isSameMonth,
	startOfMonth,
	subDays,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { selectDailyTotalsByDate } from "@src/lib/store/selectors/expenseSelectors";
import {
	buildMonthGrid,
	formatCompactAmount,
	WEEKDAY_LABELS,
} from "@src/features/finance/lib/calendarGrid";
import { formatISODate, parseISODate, todayISO } from "@src/lib/utils/isoDate";

interface DatePickerPopoverProps {
	selectedDate: string;
	onSelect: (isoDate: string) => void;
	onClose: () => void;
}

const navButton =
	"p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed";
const chip =
	"px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed";

/** Month grid showing each day's spend; jump to any month/year in a few clicks. */
const DatePickerPopover: FC<DatePickerPopoverProps> = ({
	selectedDate,
	onSelect,
	onClose,
}) => {
	const today = todayISO();
	const todayDate = parseISODate(today);
	const totals = useSelector(selectDailyTotalsByDate);

	const [viewMonth, setViewMonth] = useState(() =>
		startOfMonth(parseISODate(selectedDate)),
	);
	const [mode, setMode] = useState<"days" | "months">("days");
	const [focusedIso, setFocusedIso] = useState(selectedDate);
	const gridRef = useRef<HTMLDivElement>(null);
	// Only move DOM focus after keyboard navigation, not on every render
	const shouldFocusRef = useRef(true);

	const weeks = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
	const maxDebit = useMemo(
		() =>
			Math.max(
				0,
				...weeks.flat().map((cell) => totals[cell.iso]?.debit ?? 0),
			),
		[weeks, totals],
	);

	const monthIso = format(viewMonth, "yyyy-MM");
	// Roving tabindex: the focused day if visible, else the selected day, else the 1st
	const tabbableIso = [focusedIso, selectedDate, `${monthIso}-01`].find(
		(iso) => iso.startsWith(monthIso),
	);

	useEffect(() => {
		if (mode !== "days" || !shouldFocusRef.current) return;
		shouldFocusRef.current = false;
		gridRef.current
			?.querySelector<HTMLButtonElement>(`[data-iso="${tabbableIso}"]`)
			?.focus();
	}, [mode, tabbableIso, viewMonth]);

	const canGoNextMonth = !isSameMonth(viewMonth, todayDate) && viewMonth < todayDate;

	const moveFocus = (target: Date) => {
		const iso = formatISODate(target);
		const next = iso > today ? today : iso;
		shouldFocusRef.current = true;
		setFocusedIso(next);
		setViewMonth(startOfMonth(parseISODate(next)));
	};

	const handleGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const current = parseISODate(tabbableIso ?? selectedDate);
		const moves: Record<string, Date> = {
			ArrowLeft: subDays(current, 1),
			ArrowRight: addDays(current, 1),
			ArrowUp: subDays(current, 7),
			ArrowDown: addDays(current, 7),
			PageUp: addMonths(current, -1),
			PageDown: addMonths(current, 1),
		};
		if (moves[event.key]) {
			event.preventDefault();
			moveFocus(moves[event.key]);
		}
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Escape") {
			event.stopPropagation();
			onClose();
		}
	};

	const jumpTo = (iso: string) => {
		onSelect(iso);
		onClose();
	};

	const yesterday = formatISODate(subDays(todayDate, 1));

	return (
		<div
			role="dialog"
			aria-label="Choose a date"
			onKeyDown={handleKeyDown}
			className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-white/30 bg-white/95 p-3 shadow-xl backdrop-blur-md dark:border-white/20 dark:bg-gray-900/95"
		>
			{mode === "days" ? (
				<>
					<div className="mb-2 flex items-center justify-between">
						<button
							type="button"
							className={navButton}
							aria-label="Previous month"
							onClick={() => setViewMonth(addMonths(viewMonth, -1))}
						>
							<ChevronLeft size={16} />
						</button>
						<button
							type="button"
							className="rounded px-2 py-1 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
							aria-label="Choose month and year"
							onClick={() => setMode("months")}
						>
							{format(viewMonth, "MMMM yyyy")} ▾
						</button>
						<button
							type="button"
							className={navButton}
							aria-label="Next month"
							disabled={!canGoNextMonth}
							onClick={() => setViewMonth(addMonths(viewMonth, 1))}
						>
							<ChevronRight size={16} />
						</button>
					</div>

					<div
						role="grid"
						aria-label={format(viewMonth, "MMMM yyyy")}
						ref={gridRef}
						onKeyDown={handleGridKeyDown}
					>
						<div role="row" className="grid grid-cols-7 text-center text-[11px] text-gray-500">
							{WEEKDAY_LABELS.map((label) => (
								<span key={label} role="columnheader" className="py-1">
									{label}
								</span>
							))}
						</div>
						{weeks.map((week) => (
							<div key={week[0].iso} role="row" className="grid grid-cols-7">
								{week.map((cell) => {
									const total = totals[cell.iso];
									const isFuture = cell.iso > today;
									const isSelected = cell.iso === selectedDate;
									const heat = total?.debit
										? 0.12 + 0.38 * (total.debit / maxDebit)
										: 0;
									const summary = [
										total?.debit
											? `spent ${total.debit.toFixed(2)}`
											: "",
										total?.credit
											? `received ${total.credit.toFixed(2)}`
											: "",
									]
										.filter(Boolean)
										.join(", ");

									return (
										<button
											key={cell.iso}
											type="button"
											role="gridcell"
											data-iso={cell.iso}
											tabIndex={cell.iso === tabbableIso ? 0 : -1}
											disabled={isFuture}
											aria-selected={isSelected}
											aria-label={`${format(parseISODate(cell.iso), "d MMMM yyyy")}${summary ? `, ${summary}` : ""}`}
											onClick={() => jumpTo(cell.iso)}
											style={
												heat && !isSelected
													? { backgroundColor: `rgba(239, 68, 68, ${heat})` }
													: undefined
											}
											className={`flex h-10 flex-col items-center justify-center rounded text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-25 ${
												isSelected
													? "bg-blue-500 text-white"
													: "hover:bg-gray-200 dark:hover:bg-gray-700"
											} ${cell.inMonth ? "" : "opacity-50"} ${
												cell.iso === today && !isSelected
													? "ring-1 ring-blue-500"
													: ""
											}`}
										>
											<span>{cell.day}</span>
											<span className="text-[9px] leading-none">
												{total?.debit ? (
													formatCompactAmount(total.debit)
												) : total?.credit ? (
													<span
														className={
															isSelected ? "" : "text-green-600 dark:text-green-400"
														}
													>
														+
													</span>
												) : (
													" "
												)}
											</span>
										</button>
									);
								})}
							</div>
						))}
					</div>

					<div className="mt-3 flex flex-wrap gap-2">
						<button type="button" className={chip} onClick={() => jumpTo(today)}>
							Today
						</button>
						<button type="button" className={chip} onClick={() => jumpTo(yesterday)}>
							Yesterday
						</button>
						<button
							type="button"
							className={chip}
							onClick={() => jumpTo(`${monthIso}-01`)}
						>
							Start of month
						</button>
					</div>
				</>
			) : (
				<>
					<div className="mb-2 flex items-center justify-between">
						<button
							type="button"
							className={navButton}
							aria-label="Previous year"
							onClick={() => setViewMonth(addYears(viewMonth, -1))}
						>
							<ChevronLeft size={16} />
						</button>
						<span className="text-sm font-semibold">
							{format(viewMonth, "yyyy")}
						</span>
						<button
							type="button"
							className={navButton}
							aria-label="Next year"
							disabled={viewMonth.getFullYear() >= todayDate.getFullYear()}
							onClick={() => setViewMonth(addYears(viewMonth, 1))}
						>
							<ChevronRight size={16} />
						</button>
					</div>
					<div className="grid grid-cols-3 gap-2">
						{Array.from({ length: 12 }, (_, month) => {
							const date = new Date(viewMonth.getFullYear(), month, 1);
							const isCurrent = isSameMonth(date, viewMonth);
							return (
								<button
									key={month}
									type="button"
									disabled={date > todayDate}
									onClick={() => {
										shouldFocusRef.current = true;
										setViewMonth(date);
										setMode("days");
									}}
									className={`rounded py-2 text-sm disabled:cursor-not-allowed disabled:opacity-30 ${
										isCurrent
											? "bg-blue-500 text-white"
											: "hover:bg-gray-200 dark:hover:bg-gray-700"
									}`}
								>
									{format(date, "MMM")}
								</button>
							);
						})}
					</div>
				</>
			)}
		</div>
	);
};

export default DatePickerPopover;
