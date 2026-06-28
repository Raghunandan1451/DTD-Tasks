/**
 * Shared predicate for "is this a normal, user-selectable group" --
 * excludes "Salary" (system-managed, not a real expense category) and
 * any non-string/blank value. Used by both selectExpenseGroups
 * (derives groups from expenses, for the Edit picker) and
 * filterSelectableGroups (filters finance.groups directly, for the Add
 * picker) so the two pickers can never drift out of sync again.
 */
export const isSelectableGroup = (group: unknown): group is string =>
	typeof group === "string" && group.trim().length > 0 && group !== "Salary";

/**
 * Filters finance.groups down to the same set AND ORDER
 * selectExpenseGroups produces. Sorting (not just filtering) matters
 * here -- without it, Add (reading finance.groups directly, in
 * insertion order) and Edit (reading selectExpenseGroups, which sorts)
 * would show the same groups in different orders, which is exactly as
 * confusing as showing different groups.
 */
export const filterSelectableGroups = (groups: string[]): string[] =>
	groups.filter(isSelectableGroup).sort();
