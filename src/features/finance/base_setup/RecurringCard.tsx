import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import Button from "@src/components/ui/button/Button";
import Input from "@src/components/ui/input/Input";
import SimpleSelect from "@src/components/ui/select_dropdown/SimpleSelect";
import {
	addRecurring,
	removeRecurring,
	setRecurringPaused,
	updateRecurring,
} from "@src/lib/store/slices/financeSlice";
import {
	selectFinanceGroups,
	selectRecurring,
} from "@src/lib/store/selectors/financeSelectors";
import { todayISO } from "@src/lib/utils/isoDate";
import type { RecurringItem } from "@src/features/finance/type";
import {
	describeSchedule,
	monthlyEquivalent,
	nextDueDate,
	validateRecurringDraft,
	type RecurringDraft,
} from "@src/features/finance/lib/recurring";
import type { ShowNotificationFn } from "@src/lib/types/downloadHandlerTypes";

const FIELD =
	"rounded-md p-2 text-sm focus:ring-2 focus:ring-cyan-400 number-input-noappearance";
const BTN =
	"inline-flex min-h-9 items-center justify-center gap-1 rounded-md px-3 text-sm bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 disabled:opacity-40";

/** Nothing is pre-filled: every field starts empty and shows a hint instead. */
const emptyDraft = (): RecurringDraft => ({
	name: "",
	group: "",
	amount: "",
	everyMonths: "",
	dayOfMonth: "",
	startMonth: "",
	endMonth: "",
});

const draftFrom = (item: RecurringItem): RecurringDraft => ({
	name: item.name,
	group: item.group,
	amount: String(item.amount),
	everyMonths: String(item.everyMonths),
	dayOfMonth: String(item.dayOfMonth),
	startMonth: item.startMonth,
	endMonth: item.endMonth ?? "",
});

const money = (value: number): string =>
	value.toLocaleString(undefined, { maximumFractionDigits: 2 });

interface RecurringCardProps {
	showNotification: ShowNotificationFn;
}

/** Recurring payments: enter once, they add themselves to the expense list when due. */
const RecurringCard: React.FC<RecurringCardProps> = ({ showNotification }) => {
	const dispatch = useDispatch();
	const items = useSelector(selectRecurring);
	const allGroups = useSelector(selectFinanceGroups);
	const groups = useMemo(
		() => allGroups.filter((g) => g && g !== "Salary"),
		[allGroups],
	);

	const [editingId, setEditingId] = useState<string | "new" | null>(null);
	const [draft, setDraft] = useState<RecurringDraft>(emptyDraft);

	const today = todayISO();
	const perMonth = items.reduce(
		(sum, item) => sum + monthlyEquivalent(item),
		0,
	);

	const startNew = () => {
		setDraft(emptyDraft());
		setEditingId("new");
	};
	const startEdit = (item: RecurringItem) => {
		setDraft(draftFrom(item));
		setEditingId(item.id);
	};
	const set = (patch: Partial<RecurringDraft>) =>
		setDraft((d) => ({ ...d, ...patch }));

	const save = () => {
		const result = validateRecurringDraft(draft);
		if (!result.ok) {
			showNotification(result.message, "error");
			return;
		}
		if (editingId === "new") {
			dispatch(addRecurring(result.value));
			showNotification(
				`"${result.value.name}" will be added automatically.`,
				"success",
			);
		} else {
			const existing = items.find((item) => item.id === editingId);
			if (existing)
				dispatch(
					updateRecurring({
						...existing,
						...result.value,
						endMonth: result.value.endMonth,
					}),
				);
			showNotification("Recurring payment updated.", "success");
		}
		setEditingId(null);
	};

	return (
		<section
			aria-label="Recurring payments"
			className="rounded-lg border bg-white/20 p-4 shadow-lg backdrop-blur-xl dark:bg-black/20 md:p-6"
		>
			<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-3">
					<span className="text-sm text-gray-700 dark:text-gray-300">
						≈ {money(perMonth)} / month
					</span>
					<Button
						className={BTN}
						onClick={startNew}
						disabled={editingId !== null}
					>
						<Plus className="h-4 w-4" />
						Add
					</Button>
				</div>
			</div>

			{editingId !== null && (
				<div className="mb-4 grid gap-3 rounded-lg border p-3 md:grid-cols-2">
					<label className="text-sm" htmlFor="recurringName">
						Name
						<Input
							id="recurringName"
							className={FIELD}
							value={draft.name}
							onChange={(e) => set({ name: e.target.value })}
							placeholder="Rent, insurance, EMI…"
							maxLength={80}
						/>
					</label>
					<label className="text-sm" htmlFor="recurringAmount">
						Amount
						<Input
							id="recurringAmount"
							className={FIELD}
							type="number"
							min="0"
							value={draft.amount}
							onChange={(e) => set({ amount: e.target.value })}
							placeholder="Amount per payment"
						/>
					</label>
					<label className="text-sm" htmlFor="recurringGroup">
						Group
						<SimpleSelect
							id="recurringGroup"
							className={FIELD}
							value={draft.group}
							onChange={(e) => set({ group: e.target.value })}
							options={groups}
							placeholder={
								groups.length === 0
									? "Add a group in Setup first"
									: "Select a group"
							}
						/>
					</label>
					<label className="text-sm" htmlFor="recurringEvery">
						Repeats every (months)
						<Input
							id="recurringEvery"
							className={FIELD}
							type="number"
							min="1"
							max="120"
							value={draft.everyMonths}
							onChange={(e) =>
								set({ everyMonths: e.target.value })
							}
							placeholder="1 = monthly, 12 = yearly"
						/>
					</label>
					<label className="text-sm" htmlFor="recurringDay">
						Day of month
						<Input
							id="recurringDay"
							className={FIELD}
							type="number"
							min="1"
							max="31"
							value={draft.dayOfMonth}
							onChange={(e) =>
								set({ dayOfMonth: e.target.value })
							}
							placeholder="1–31"
						/>
					</label>
					<label className="text-sm" htmlFor="recurringStart">
						Starts
						<Input
							id="recurringStart"
							className={FIELD}
							value={draft.startMonth}
							onChange={(e) =>
								set({ startMonth: e.target.value })
							}
							placeholder="YYYY-MM"
							maxLength={7}
						/>
					</label>
					<label className="text-sm" htmlFor="recurringEnd">
						Ends (optional)
						<Input
							id="recurringEnd"
							className={FIELD}
							value={draft.endMonth}
							onChange={(e) => set({ endMonth: e.target.value })}
							placeholder="YYYY-MM, leave empty to repeat"
							maxLength={7}
						/>
					</label>
					<div className="flex gap-2 md:col-span-2">
						<Button className={`${BTN} btn-primary`} onClick={save}>
							{editingId === "new"
								? "Add payment"
								: "Save changes"}
						</Button>
						<Button
							className={BTN}
							onClick={() => setEditingId(null)}
						>
							Cancel
						</Button>
					</div>
				</div>
			)}

			{items.length === 0 ? (
				<p className="text-sm text-gray-700 dark:text-gray-300">
					Nothing yet. Add rent, subscriptions, EMIs or a yearly
					premium once and they appear in your expenses on their own.
				</p>
			) : (
				<ul className="space-y-2">
					{items.map((item) => {
						const next = nextDueDate(item, today);
						return (
							<li
								key={item.id}
								className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 ${
									item.paused ? "opacity-60" : ""
								}`}
							>
								<div className="min-w-0">
									<p className="truncate font-medium text-gray-800 dark:text-gray-100">
										{item.name}{" "}
										<span className="text-sm font-normal text-gray-600 dark:text-gray-300">
											· {item.group} ·{" "}
											{money(item.amount)}
										</span>
									</p>
									<p className="text-xs text-gray-600 dark:text-gray-300">
										{describeSchedule(item)}
										{item.paused
											? " · Paused"
											: next
												? ` · Next ${next}`
												: " · Finished"}
									</p>
								</div>
								<div className="flex items-center gap-1">
									<Button
										className={BTN}
										title={item.paused ? "Resume" : "Pause"}
										aria-label={`${item.paused ? "Resume" : "Pause"} ${item.name}`}
										onClick={() =>
											dispatch(
												setRecurringPaused({
													id: item.id,
													paused: !item.paused,
												}),
											)
										}
									>
										{item.paused ? (
											<Play className="h-4 w-4" />
										) : (
											<Pause className="h-4 w-4" />
										)}
									</Button>
									<Button
										className={BTN}
										title="Edit"
										aria-label={`Edit ${item.name}`}
										onClick={() => startEdit(item)}
										disabled={editingId !== null}
									>
										<Pencil className="h-4 w-4" />
									</Button>
									<Button
										className={`${BTN} hover:!text-red-600`}
										title="Delete"
										aria-label={`Delete ${item.name}`}
										onClick={() => {
											if (
												window.confirm(
													`Delete "${item.name}"? Entries already added to your expenses stay.`,
												)
											) {
												dispatch(
													removeRecurring(item.id),
												);
											}
										}}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
};

export default RecurringCard;
