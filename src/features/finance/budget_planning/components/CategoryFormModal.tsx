import { FC, FormEvent, useRef } from "react";
import Button from "@src/components/ui/button/Button";
import Input from "@src/components/ui/input/Input";
import { BudgetCategory } from "@src/features/finance/type";
import { ModalLayout } from "@src/features/event/components/forms/ModalLayout";
import { CategoryDraft } from "@src/features/finance/budget_planning/types";
import { clampPercentage } from "@src/features/finance/budget_planning/lib/budgetPlanUtils";

interface CategoryFormModalProps {
	draft: CategoryDraft;
	onChange: (updates: Partial<BudgetCategory>) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onClose: () => void;
}

const CategoryFormModal: FC<CategoryFormModalProps> = ({
	draft,
	onChange,
	onSubmit,
	onClose,
}) => {
	const formRef = useRef<HTMLFormElement>(null);

	return (
		<ModalLayout
			title={draft.isNew ? "Add Budget Category" : "Edit Budget Category"}
			onClose={onClose}
			maxWidth="max-w-md"
			footer={
				<div className="flex justify-end gap-2">
					<Button
						type="button"
						onClick={onClose}
						className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={() => formRef.current?.requestSubmit()}
						className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
					>
						{draft.isNew ? "Add Category" : "Save Changes"}
					</Button>
				</div>
			}
		>
			<form
				id="budget-category-form"
				ref={formRef}
				onSubmit={onSubmit}
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
						value={draft.category.name}
						onChange={(event) => onChange({ name: event.target.value })}
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
						value={String(draft.category.percentage)}
						onChange={(event) => {
							const percentage = Number(event.target.value);
							onChange({
								percentage: Number.isFinite(percentage)
									? clampPercentage(percentage)
									: 0,
							});
						}}
						className="number-input-noappearance mt-1"
					/>
				</label>
			</form>
		</ModalLayout>
	);
};

export default CategoryFormModal;
