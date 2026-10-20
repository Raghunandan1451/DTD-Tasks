import { format, subMonths } from "date-fns";

export const getMinimumEventDate = (): string =>
	format(subMonths(new Date(), 1), "yyyy-MM-dd");
