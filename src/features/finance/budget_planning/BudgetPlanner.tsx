import { FC, FormEvent, useMemo, useRef, useState } from "react";
import { addMonths, format, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import Button from "@src/components/ui/button/Button";
import Input from "@src/components/ui/input/Input";
import { BudgetCategory, ExpenseEntry } from "@src/features/finance/type";
import { DEFAULT_BUDGET_CATEGORIES } from "@src/features/finance/lib/budgetCategories";
import { ModalLayout } from "@src/features/event/components/forms/ModalLayout";
import { ConfirmationModal } from "@src/components/shared/dialog/ConfirmModal";
import { useConfirmationModal } from "@src/lib/hooks/useConfirmDialog";

interface CategoryDraft {
	category: BudgetCategory;
	isNew: boolean;
}

interface BudgetPlannerProps {
	monthlyIncome: number;
	legacyCategories?: BudgetCategory[];
	plansByMonth?: Record<string, BudgetCategory[]>;
	onPlanChange: (month: string, categories: BudgetCategory[]) => void;
	expenses: ExpenseEntry[];
}

const formatAmount = (amount: number): string =>
	amount.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

const getDefaultCategories = (
	legacyCategories: BudgetCategory[] | undefined,
	month: string,
): BudgetCategory[] =>
	month === format(new Date(), "yyyy-MM")
		? (legacyCategories ?? DEFAULT_BUDGET_CATEGORIES)
		: DEFAULT_BUDGET_CATEGORIES;

const BudgetPlanner: FC<BudgetPlannerProps> = ({
	monthlyIncome,
	legacyCategories,
	plansByMonth = {},
	onPlanChange,
	expenses,
}) => {
	const [monthDate, setMonthDate] = useState(() => new Date());
	const [activePickerCategoryId, setActivePickerCategoryId] = useState<
		string | null
	>(null);
	const [categoryDraft, setCategoryDraft] = useState<CategoryDraft | null>(
		null,
	);
	const categoryFormRef = useRef<HTMLFormElement>(null);
	const confirmationModal = useConfirmationModal();
	const month = format(monthDate, "yyyy-MM");
	const categories =
		plansByMonth[month] ?? getDefaultCategories(legacyCategories, month);

	const monthlyExpenses = useMemo(
		() =>
			expenses.filter(
				(expense) =>
					expense.date.startsWith(month) &&
					expense.type !== "Cr" &&
					expense.group !== "Salary",
			),
		[expenses, month],
	);

	const assignedExpenseIds = new Set(
		categories.flatMap((category) =>
			(category.expenses ?? [])
				.map((expense) => expense.expenseId)
				.filter((id): id is string => Boolean(id)),
		),
	);
	const totalPercentage = categories.reduce(
		(total, category) => total + category.percentage,
		0,
	);
	const overallocated = totalPercentage > 100;
	const underallocated = totalPercentage < 100;

	const updateCategory = (id: string, updates: Partial<BudgetCategory>) => {
		onPlanChange(
			month,
			categories.map((category) =>
				category.id === id ? { ...category, ...updates } : category,
			),
		);
	};

	const openAddCategory = () => {
		setCategoryDraft({
			isNew: true,
			category: {
				id: `budget-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				name: "",
				percentage: 0,
				expenses: [],
			},
		});
	};

	const openEditCategory = (category: BudgetCategory) => {
		setCategoryDraft({ category: { ...category }, isNew: false });
	};

	const saveCategory = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!categoryDraft) return;
		const name = categoryDraft.category.name.trim();
		if (!name) return;

		const updatedCategory = {
			...categoryDraft.category,
			name,
			percentage: Math.min(
				100,
				Math.max(0, categoryDraft.category.percentage),
			),
		};
		onPlanChange(
			month,
			categoryDraft.isNew
				? [...categories, updatedCategory]
				: categories.map((category) =>
						category.id === updatedCategory.id
							? updatedCategory
							: category,
					),
		);
		setCategoryDraft(null);
	};

	const removeCategory = async (category: BudgetCategory) => {
		const confirmed = await confirmationModal.confirm({
			title: "Delete Category",
			message:
				"Are you sure you want to delete this budget category? Expenses assigned to it will be removed from this budget plan.",
			itemName: category.name,
			confirmText: "Delete",
			cancelText: "Cancel",
			type: "danger",
		});
		if (!confirmed) return;

		onPlanChange(
			month,
			categories.filter((item) => item.id !== category.id),
		);
		if (activePickerCategoryId === category.id)
			setActivePickerCategoryId(null);
	};

	const addExpense = (category: BudgetCategory, entry: ExpenseEntry) => {
		updateCategory(category.id, {
			expenses: [
				...(category.expenses ?? []),
				{
					id: `budget-expense-${entry.id}`,
					expenseId: entry.id,
					name: entry.name,
					amount: entry.amount,
				},
			],
		});
		setActivePickerCategoryId(null);
	};

	const removeExpense = (category: BudgetCategory, expenseId: string) => {
		updateCategory(category.id, {
			expenses: (category.expenses ?? []).filter(
				(expense) => expense.id !== expenseId,
			),
		});
	};

	return (
		<section className="space-y-4" aria-label="Monthly income budget plan">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-1">
					<Button
						type="button"
						onClick={() =>
							setMonthDate((date) => subMonths(date, 1))
						}
						aria-label="Previous budget month"
						className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<h2
						className="min-w-32 text-center font-semibold"
						aria-live="polite"
					>
						{format(monthDate, "MMMM yyyy")}
					</h2>
					<Button
						type="button"
						onClick={() =>
							setMonthDate((date) => addMonths(date, 1))
						}
						aria-label="Next budget month"
						className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					{underallocated && (
						<p
							role="status"
							className="text-sm text-amber-700 dark:text-amber-300"
						>
							{(100 - totalPercentage).toFixed(1)}% unallocated
						</p>
					)}
					{overallocated && (
						<p
							role="status"
							className="text-sm text-amber-700 dark:text-amber-300"
						>
							Allocations exceed 100%
						</p>
					)}
					<Button
						type="button"
						onClick={openAddCategory}
						className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
					>
						<Plus className="h-4 w-4" />
						Add category
					</Button>
				</div>
			</div>

			<div
				className="grid items-start gap-3"
				aria-label={`${format(monthDate, "MMMM yyyy")} budget categories`}
				style={{
					gridTemplateColumns:
						"repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
				}}
			>
				{categories.map((category) => {
					const isDisabled = category.percentage === 0;
					const allocatedAmount =
						(monthlyIncome * category.percentage) / 100;
					const categoryExpenses = category.expenses ?? [];
					const availableExpenses = monthlyExpenses.filter(
						(expense) => !assignedExpenseIds.has(expense.id),
					);

					return (
						<div
							key={`${month}-${category.id}`}
							className={`min-w-0 space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700 ${
								isDisabled
									? "bg-gray-100/70 dark:bg-gray-900/30"
									: "bg-white/50 dark:bg-gray-800/40"
							}`}
						>
							<div className="flex min-w-0 items-center gap-2">
								<div className="min-w-0 flex-1">
									<p className="text-xs text-gray-500 dark:text-gray-400">
										Category
									</p>
									<h3 className="truncate text-base font-semibold">
										{category.name || "Unnamed category"}
									</h3>
								</div>
								<div className="shrink-0 text-right">
									<p className="text-xs text-gray-500 dark:text-gray-400">
										Allocation
									</p>
									<p className="text-sm font-medium">
										{category.percentage}%
									</p>
								</div>
								<Button
									type="button"
									onClick={() => openEditCategory(category)}
									aria-label={`Edit ${category.name || "category"}`}
									title="Edit category"
									className="rounded-md p-2 text-gray-500 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
								>
									<Pencil className="h-4 w-4" />
								</Button>
								<Button
									type="button"
									onClick={() =>
										void removeCategory(category)
									}
									aria-label={`Remove ${category.name || "category"}`}
									title="Remove category"
									className="rounded-md p-2 text-gray-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-300"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>

							<div className="border-t border-gray-200 pt-2 text-sm dark:border-gray-700">
								<span className="text-gray-500 dark:text-gray-400">
									Allocated:{" "}
								</span>
								<span className="font-medium">
									{formatAmount(allocatedAmount)}
								</span>
							</div>

							<div className="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
								{categoryExpenses.map((budgetExpense) => {
									const ledgerExpense =
										budgetExpense.expenseId === undefined
											? undefined
											: monthlyExpenses.find(
													(expense) =>
														expense.id ===
														budgetExpense.expenseId,
												);
									const name =
										ledgerExpense?.name ??
										budgetExpense.name;
									const amount =
										ledgerExpense?.amount ??
										budgetExpense.amount;

									return (
										<div
											key={budgetExpense.id}
											className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-600 dark:bg-gray-800"
										>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-medium">
													{name || "Expense"}
												</p>
												<p className="text-sm text-gray-600 dark:text-gray-300">
													{formatAmount(amount)}
												</p>
											</div>
											<Button
												type="button"
												onClick={() =>
													removeExpense(
														category,
														budgetExpense.id,
													)
												}
												aria-label={`Remove ${name || "expense"}`}
												title="Remove expense"
												className="rounded-md p-2 text-gray-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-300"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									);
								})}

								{activePickerCategoryId === category.id ? (
									<div className="space-y-2 rounded-lg border border-gray-200 p-2 dark:border-gray-600">
										<div className="flex items-center justify-between gap-2">
											<p className="text-sm font-medium">
												Expenses in{" "}
												{format(monthDate, "MMMM")}
											</p>
											<Button
												type="button"
												onClick={() =>
													setActivePickerCategoryId(
														null,
													)
												}
												aria-label="Close expense list"
												className="rounded px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
											>
												Close
											</Button>
										</div>
										{availableExpenses.length === 0 ? (
											<p className="text-sm text-gray-500 dark:text-gray-400">
												No unassigned expenses in this
												month.
											</p>
										) : (
											<ul className="max-h-48 space-y-1 overflow-y-auto">
												{availableExpenses.map(
													(expense) => (
														<li key={expense.id}>
															<Button
																type="button"
																onClick={() =>
																	addExpense(
																		category,
																		expense,
																	)
																}
																className="flex w-full items-center justify-between gap-2 rounded-md p-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
															>
																<span className="truncate">
																	{
																		expense.name
																	}
																</span>
																<span className="shrink-0">
																	{formatAmount(
																		expense.amount,
																	)}
																</span>
															</Button>
														</li>
													),
												)}
											</ul>
										)}
									</div>
								) : (
									<Button
										type="button"
										onClick={() =>
											setActivePickerCategoryId(
												category.id,
											)
										}
										disabled={isDisabled}
										className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
									>
										<Plus className="h-4 w-4" />
										Add expense
									</Button>
								)}
							</div>
						</div>
					);
				})}
			</div>
			{categoryDraft && (
				<ModalLayout
					title={
						categoryDraft.isNew
							? "Add Budget Category"
							: "Edit Budget Category"
					}
					onClose={() => setCategoryDraft(null)}
					maxWidth="max-w-md"
					footer={
						<div className="flex justify-end gap-2">
							<Button
								type="button"
								onClick={() => setCategoryDraft(null)}
								className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
							>
								Cancel
							</Button>
							<Button
								type="button"
								onClick={() =>
									categoryFormRef.current?.requestSubmit()
								}
								className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
							>
								{categoryDraft.isNew
									? "Add Category"
									: "Save Changes"}
							</Button>
						</div>
					}
				>
					<form
						id="budget-category-form"
						ref={categoryFormRef}
						onSubmit={saveCategory}
						className="space-y-4"
					>
						<label
							htmlFor="budget-category-name"
							className="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Category
							<Input
								id="budget-category-name"
								aria-label="Category name"
								value={categoryDraft.category.name}
								onChange={(event) =>
									setCategoryDraft((current) =>
										current
											? {
													...current,
													category: {
														...current.category,
														name: event.target
															.value,
													},
												}
											: current,
									)
								}
								placeholder="Category name"
								required
								className="mt-1"
							/>
						</label>
						<label
							htmlFor="budget-category-percentage"
							className="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Allocation %
							<Input
								id="budget-category-percentage"
								aria-label="Allocation percentage"
								type="number"
								min="0"
								max="100"
								step="0.1"
								value={String(
									categoryDraft.category.percentage,
								)}
								onChange={(event) => {
									const percentage = Number(
										event.target.value,
									);
									setCategoryDraft((current) =>
										current
											? {
													...current,
													category: {
														...current.category,
														percentage:
															Number.isFinite(
																percentage,
															)
																? Math.min(
																		100,
																		Math.max(
																			0,
																			percentage,
																		),
																	)
																: 0,
													},
												}
											: current,
									);
								}}
								className="number-input-noappearance mt-1"
							/>
						</label>
					</form>
				</ModalLayout>
			)}
			<ConfirmationModal
				isOpen={confirmationModal.isOpen}
				options={confirmationModal.options}
				onConfirm={confirmationModal.handleConfirm}
				onCancel={confirmationModal.handleCancel}
			/>
		</section>
	);
};

export default BudgetPlanner;
