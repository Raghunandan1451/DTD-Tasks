import jsPDF from "jspdf";
import { BLACK, RED, formatMoney, setColor, signed } from "@src/features/finance/lib/pdf/pdfLayout";

// Right edges of the money columns in the category table
export const COL_ALLOCATED = 110;
export const COL_SPENT = 145;
export const COL_LEFT = 180;

export const drawMoneyCell = (
	doc: jsPDF,
	value: number,
	rightEdge: number,
	y: number,
	options: { sign?: boolean; negativeIsBad?: boolean } = {},
): void => {
	const text = options.sign ? signed(value) : formatMoney(value);
	if (options.negativeIsBad && value < 0) setColor(doc, RED);
	doc.text(text, rightEdge, y, { align: "right" });
	setColor(doc, BLACK);
};
