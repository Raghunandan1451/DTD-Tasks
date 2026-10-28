import { FormEvent, useState } from "react";
import { BudgetCategory } from "@src/features/finance/type";
import { CategoryDraft } from "@src/features/finance/budget_planning/types";
import {
	clampPercentage,
	createBudgetCategory,
} from "@src/features/finance/budget_planning/lib/budgetPlanUtils";

interface UseCategoryDraftParams {
	month: string;
	categories: BudgetCategory[];
	onPlanChange: (month: string, categories: BudgetCategory[]) => void;
}

/** Owns the add/edit category modal state and persists the saved category */
export const useCategoryDraft = ({
	month,
	categories,
	onPlanChange,
}: UseCategoryDraftParams) => {
	const [categoryDraft, setCategoryDraft] = useState<CategoryDraft | null>(
		null,
	);

	const openAddCategory = () => {
		setCategoryDraft({ isNew: true, category: createBudgetCategory() });
	};

	const openEditCategory = (category: BudgetCategory) => {
		setCategoryDraft({ category: { ...category }, isNew: false });
	};

	const closeCategoryDraft = () => setCategoryDraft(null);

	const updateDraft = (updates: Partial<BudgetCategory>) => {
		setCategoryDraft((current) =>
			current
				? {
						...current,
						category: { ...current.category, ...updates },
					}
				: current,
		);
	};

	const saveCategory = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!categoryDraft) return;
		const name = categoryDraft.category.name.trim();
		if (!name) return;

		const updatedCategory = {
			...categoryDraft.category,
			name,
			percentage: clampPercentage(categoryDraft.category.percentage),
		};
		onPlanChange(
			month,
			categoryDraft.isNew
				? [...categories, updatedCategory]
				: categories.map((category) =>
						category.id === updatedCategory.id ? updatedCategory : category,
					),
		);
		setCategoryDraft(null);
	};

	return {
		categoryDraft,
		openAddCategory,
		openEditCategory,
		closeCategoryDraft,
		updateDraft,
		saveCategory,
	};
};
